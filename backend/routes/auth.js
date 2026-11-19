const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getIO } = require('../socket');

const generateToken = (id, sessionId) => {
  return jwt.sign({ id, sessionId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '1d' });
};

router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { username, email, password, role, adminKey, securityQuestions } = req.body;

  // Validate security questions
  if (!Array.isArray(securityQuestions) || securityQuestions.length !== 3 ||
      securityQuestions.some(q => !q.question || !q.question.trim() || !q.answer || !q.answer.trim())) {
    return res.status(400).json({ success: false, message: 'Exactly 3 security questions with non-empty question and answer are required.' });
  }

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'That email is already registered' });
    }
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'That username is already taken' });
    }

    // Hash security answers
    const hashedQuestions = await Promise.all(securityQuestions.map(async (q) => {
      const normalized = q.answer.trim().toLowerCase();
      const answerHash = await bcrypt.hash(normalized, 10);
      return { question: q.question, answerHash };
    }));

    const userRole = (role === 'admin' && adminKey === process.env.ADMIN_SECRET_KEY) ? 'admin' : 'player';
    const user = await User.create({ username, email, password, role: userRole, securityQuestions: hashedQuestions });

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please sign in.',
      user: { username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /security-questions?email=...
router.get('/security-questions', async (req, res) => {
  // Always return the fixed 3 questions — do not reveal if email exists
  res.json({
    success: true,
    questions: [
      "What was the name of your first pet?",
      "What is your mother's maiden name?",
      "What was the name of the city where you were born?"
    ]
  });
});

// POST /forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email, answers } = req.body;
  if (!Array.isArray(answers) || answers.length !== 3) {
    return res.status(400).json({ success: false, message: 'Exactly 3 answers are required.' });
  }
  try {
    const user = await User.findOne({ email }).select('+securityQuestions.answerHash');
    if (!user || !user.securityQuestions || user.securityQuestions.length !== 3) {
      return res.status(400).json({ success: false, message: 'One or more answers are incorrect.' });
    }

    for (let i = 0; i < 3; i++) {
      const normalized = (answers[i].answer || '').trim().toLowerCase();
      const match = await bcrypt.compare(normalized, user.securityQuestions[i].answerHash);
      if (!match) {
        return res.status(400).json({ success: false, message: 'One or more answers are incorrect.' });
      }
    }

    const resetToken = require('crypto').randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    res.json({ success: true, resetToken });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /reset-password
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.currentSessionId = null;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully. Please sign in.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /change-password (requires auth)
// Allows changing password via currentPassword OR via security question verification
// Also allows updating personal security questions
router.post('/change-password', protect, async (req, res) => {
  const { currentPassword, answers, newPassword, newSecurityQuestions } = req.body;

  try {
    const user = await User.findById(req.user._id).select('+password +securityQuestions.answerHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let authorized = false;

    // Method 1: Verified via current password
    if (currentPassword) {
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }
      authorized = true;
    }
    // Method 2: Verified via security question answers
    else if (Array.isArray(answers) && answers.length === 3) {
      if (!user.securityQuestions || user.securityQuestions.length !== 3) {
        return res.status(400).json({ success: false, message: 'Security questions are not configured.' });
      }

      for (let i = 0; i < 3; i++) {
        const normalized = (answers[i].answer || '').trim().toLowerCase();
        const match = await bcrypt.compare(normalized, user.securityQuestions[i].answerHash);
        if (!match) {
          return res.status(400).json({ success: false, message: 'One or more security answers are incorrect.' });
        }
      }
      authorized = true;
    } else {
      return res.status(400).json({ success: false, message: 'Please provide either your current password or answer all 3 security questions.' });
    }

    if (!authorized) {
      return res.status(400).json({ success: false, message: 'Verification failed.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    user.password = newPassword;

    // Optional: update 3 security questions if provided
    if (Array.isArray(newSecurityQuestions) && newSecurityQuestions.length === 3) {
      const validQuestions = newSecurityQuestions.every(
        (q) => q && q.question && q.question.trim() && q.answer && q.answer.trim()
      );
      if (validQuestions) {
        const hashedQuestions = await Promise.all(newSecurityQuestions.map(async (q) => {
          const normalized = q.answer.trim().toLowerCase();
          const answerHash = await bcrypt.hash(normalized, 10);
          return { question: q.question.trim(), answerHash };
        }));
        user.securityQuestions = hashedQuestions;
      }
    }

    user.currentSessionId = null;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully! Please sign in again.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account has been deactivated' });

    const newSessionId = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2));

    if (user.currentSessionId) {
      try {
        getIO().emit('auth:force_logout', {
          userId: user._id.toString(),
          previousSessionId: user.currentSessionId,
          message: 'Your account was logged in from another browser or device.'
        });
      } catch (err) {
        console.error('Socket force logout emit error:', err.message);
      }
    }

    user.currentSessionId = newSessionId;
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id, newSessionId);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
