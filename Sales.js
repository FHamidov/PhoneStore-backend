const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    model: { type: String, required: true },
    quantity: { type: Number, required: true },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Sale', salesSchema);