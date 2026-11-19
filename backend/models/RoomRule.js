const mongoose = require('mongoose');

const roomRuleSchema = new mongoose.Schema({
  title: { type: String, default: 'Official Room & Lottery Rules' },
  rules: {
    type: [String],
    default: [
      'Minimum Players Threshold: Every room requires a minimum number of players. If the room is not filled with minimum players within the countdown time, 100% of the entry fee is automatically refunded to participants.',
      'Lockdown: Once the countdown hits 00:00, the room status changes to In Progress and registration locks permanently.',
      'Fair RNG Draw: A cryptographically randomized selection algorithm picks one winner from the registered participant pool.',
      'Instant Payout: The winning prize is credited immediately to the winner wallet upon draw completion.',
      'Entry fees are non-refundable after a successful draw.'
    ]
  },
  minUsersDefault: { type: Number, default: 2, min: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('RoomRule', roomRuleSchema);
