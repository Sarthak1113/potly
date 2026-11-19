const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const CashoutRule = require('./models/CashoutRule');
const RoomRule = require('./models/RoomRule');
const Notice = require('./models/Notice');

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing in environment!');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');

    // 1. Seed or verify Admin user
    let admin = await User.findOne({ email: 'admin@game.com' });
    if (!admin) {
      console.log('Creating initial admin user (admin@game.com)...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const defaultQuestions = [
        { question: "What is your mother's maiden name?", answer: 'potly' },
        { question: "What was the name of your first pet?", answer: 'lucky' },
        { question: "In what city were you born?", answer: 'mumbai' }
      ];

      const hashedQuestions = await Promise.all(defaultQuestions.map(async (q) => {
        const normalized = q.answer.trim().toLowerCase();
        const answerHash = await bcrypt.hash(normalized, 10);
        return { question: q.question, answerHash };
      }));

      admin = await User.create({
        username: 'admin',
        email: 'admin@game.com',
        password: hashedPassword,
        role: 'admin',
        balance: 10000,
        securityQuestions: hashedQuestions
      });
      console.log('Admin user created successfully! (Email: admin@game.com / Password: admin123)');
    } else {
      console.log('Admin user already exists.');
    }

    // 2. Seed initial CashoutRule
    const cashoutRule = await CashoutRule.findOne();
    if (!cashoutRule) {
      console.log('Creating default cashout rules...');
      await CashoutRule.create({
        minCashout: 100,
        maxCashoutPerDay: 5000,
        maxRequestsPerDay: 5,
        guidelines: 'Withdrawals are processed manually by Admin. Maximum cashout is capped at your available balance. Please ensure your payment details are accurate.',
        updatedBy: admin._id
      });
      console.log('Default cashout rules created.');
    } else {
      console.log('Cashout rules already exist.');
    }

    // 3. Seed initial RoomRule
    const roomRule = await RoomRule.findOne();
    if (!roomRule) {
      console.log('Creating default room rules...');
      await RoomRule.create({
        title: 'Official Room & Lottery Rules',
        rules: [
          'Minimum Players Threshold: Every room requires a minimum number of players. If the room is not filled with minimum players within the countdown time, 100% of the entry fee is automatically refunded to participants.',
          'Lockdown: Once the countdown hits 00:00, the room status changes to In Progress and registration locks permanently.',
          'Fair RNG Draw: A cryptographically randomized selection algorithm picks one winner from the registered participant pool.',
          'Instant Payout: The winning prize is credited immediately to the winner wallet upon draw completion.',
          'Entry fees are non-refundable after a successful draw.'
        ],
        minUsersDefault: 2,
        updatedBy: admin._id
      });
      console.log('Default room rules created.');
    } else {
      console.log('Room rules already exist.');
    }

    // 4. Seed initial Notice (inactive)
    const notice = await Notice.findOne();
    if (!notice) {
      console.log('Creating default notice...');
      await Notice.create({
        title: 'Important Notice for Players',
        content: 'Welcome to Potly! Enjoy fair gameplay, live multiplayer game rooms, and instant payouts. Please ensure your account details are verified.',
        isActive: false,
        type: 'announcement',
        updatedBy: admin._id
      });
      console.log('Default notice created.');
    } else {
      console.log('Notice already exists.');
    }

    console.log('All initial seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
};

seed();
