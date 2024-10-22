const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    models: [{
        model: {
            type: String,
            required: true
        },
        quantityInStock: {
            type: Number,
            default: 0
        },
        soldQuantity: {
            type: Number,
            default: 0
        }
    }]
});

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;
