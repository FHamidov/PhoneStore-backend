const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    soldPhones: [{
        brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
        model: String,
        quantity: {
            type: Number,
            default: 0
        }
    }]
});

const Seller = mongoose.model('Seller', sellerSchema);
module.exports = Seller;
