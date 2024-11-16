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
app.get('/sellers/sales', async (req, res) => {
    try {
        const sellers = await Seller.find();
        const salesData = await Promise.all(sellers.map(async seller => {
            const soldPhones = seller.soldPhones || [];
            const brandsWithSales = {};

            for (const sale of soldPhones) {
                const brand = await Brand.findById(sale.brandId);
                if (brand) {
                    if (!brandsWithSales[brand.name]) {
                        brandsWithSales[brand.name] = {};
                    }
                    if (!brandsWithSales[brand.name][sale.model]) {
                        brandsWithSales[brand.name][sale.model] = 0;
                    }
                    brandsWithSales[brand.name][sale.model] += sale.quantity;
                }
            }

            return { seller: seller.name, sales: brandsWithSales };
        }));

        res.json(salesData);
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

app.get('/totalPhones', async (req, res) => {
    try {
        const brands = await Brand.find();
        const totalPhones = brands.reduce((total, brand) => {
            return total + brand.models.reduce((sum, model) => sum + model.quantityInStock, 0);
        }, 0);

        res.json({ totalPhones });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/sellers/sales/models', async (req, res) => {
    const { brandId, model } = req.query; // modelName əvəzinə model istifadə edin

    console.log("Received brandId:", brandId);
    console.log("Received model:", model); // modelName əvəzinə model

    try {
        const sellers = await Seller.find();
        console.log("Found sellers:", sellers);
        
        // `brandId`-nı `ObjectId`-ya çevirin
        const brandObjectId = new mongoose.Types.ObjectId(brandId);

        const salesData = await Promise.all(sellers.map(async (seller) => {
            const soldPhones = seller.soldPhones || [];
            console.log("Sold phones data for seller:", seller.name, soldPhones);

            const brandData = await Promise.all(soldPhones.map(async (sale) => {
                // `ObjectId`-ya çevrilmiş `brandId`-nı yoxlayırıq
                if (sale.brandId.equals(brandObjectId) && sale.model === model) { // modelName əvəzinə model istifadə edin
                    return { seller: seller.name, model: sale.model, quantity: sale.quantity };
                }
                return null;
            }));

            return brandData.filter((data) => data !== null);
        }));

        const filteredSalesData = salesData.flat();

        if (filteredSalesData.length === 0) {
            return res.status(404).json({ message: 'No sales data found for the specified model and brand.' });
        }

        console.log("Filtered sales data:", filteredSalesData);
        res.json(filteredSalesData);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: error.message });
    }
});
app.get('/brandPhoneCounts', async (req, res) => {
    try {
        const brands = await Brand.find();
        
        // Hər markanın telefon sayını toplamaq üçün xəritə yarat
        const brandPhoneCounts = brands.reduce((acc, brand) => {
            // Markanın bütün modellərindən quantityInStock-u toplayırıq
            const totalPhones = brand.models.reduce((sum, model) => sum + model.quantityInStock, 0);
            acc[brand.name] = totalPhones; // Markanın adı ilə telefon sayını xəritəyə əlavə et
            return acc;
        }, {});
        
        res.json(brandPhoneCounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
