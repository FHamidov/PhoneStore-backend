const express = require('express');
const mongoose = require('mongoose');
const Brand = require('./models/Brand');
const Seller = require('./models/Seller');

const app = express();
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/anbar', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

app.get('/brands', async (req, res) => {
    try {
        const brands = await Brand.find();
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
app.get('/sales', async (req, res) => {
    try {
        const brands = await Brand.find();

        const salesReport = brands.map(brand => {
            return {
                brand: brand.name,
                models: brand.models.map(model => ({
                    model: model.model,
                    soldQuantity: model.soldQuantity
                }))
            };
        });

        res.json(salesReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
app.post('/brands', async (req, res) => {
    const { name, models } = req.body;

    try {
        let brand = await Brand.findOne({ name });

        if (brand) {
            for (const modelData of models) {
                const existingModel = brand.models.find(m => m.model === modelData.model);

                if (existingModel) {
                    existingModel.quantityInStock += modelData.quantityInStock;
                } else {
                    brand.models.push(modelData);
                }
            }
        } else {
            brand = new Brand({ name, models });
        }

        const savedBrand = await brand.save();
        res.status(201).json(savedBrand);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/sellers', async (req, res) => {
    try {
        const sellers = await Seller.find();
        res.json(sellers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/sellers', async (req, res) => {
    const { name } = req.body;
    const seller = new Seller({ name });

    try {
        const savedSeller = await seller.save();
        res.status(201).json(savedSeller);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.post('/sales', async (req, res) => {
    const { sellerId, brandId, model, quantity } = req.body;

    try {
        const seller = await Seller.findById(sellerId);
        if (!seller) {
            return res.status(404).json({ message: 'Seller not found' });
        }

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }

        const modelData = brand.models.find(m => m.model === model);
        if (!modelData) {
            return res.status(404).json({ message: 'Model not found' });
        }

        if (modelData.quantityInStock < quantity) {
            return res.status(400).json({ message: 'Not enough stock' });
        }

        modelData.quantityInStock -= quantity;
        modelData.soldQuantity += quantity;

        const existingSale = seller.soldPhones.find(s => s.model === model);
        if (existingSale) {
            existingSale.quantity += quantity;
        } else {
            seller.soldPhones.push({ brandId, model, quantity });
        }

        await brand.save();
        await seller.save();

        res.status(201).json({ message: 'Sale completed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
