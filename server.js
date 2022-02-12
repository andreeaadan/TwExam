require('dotenv').config({})
const express = require('express')
const Sequelize = require('sequelize')
const cors = require('cors')
const path = require('path')
const Op = Sequelize.Op

const serverError = 'Server Error';

let sequelize;

if (process.env.NODE_ENV === 'development') {
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: 'sample.db',
        define: {
            timestamps: false
        }
    })
} else {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
    })
}

const Spacecraft = sequelize.define('spacecraft', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    nume: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            len: [2, 100]
        }
    },
    vitezaMaxima: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
            min: 1001
        }
    },
    masa: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
            min: 201
        }
    }
})

const Astronaut = sequelize.define('astronaut', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    nume: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            len: [4, 100]
        }
    },
    rol: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            isIn: [['COMMANDER', 'PILOT', 'GENERAL']]
        }
    }
});

Spacecraft.hasMany(Astronaut, { foreignKey: 'spacecraftId' });
Astronaut.belongsTo(Spacecraft, { foreignKey: 'spacecraftId' });

const app = express()
app.use(express.static(path.join(__dirname, 'public')))
app.use(cors())
app.use(express.json())

app.get('/sync', async (req, res) => {
    try {
        await sequelize.sync({ force: true })
        res.status(201).json({ message: "Tables created" })
    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.get('/spacecrafts', async (req, res) => {
    try {
        const query = {}
        let limit = 5
        const allowedFilters = ['vitezaMaxima', 'nume', 'masa']
        const filterKeys = Object.keys(req.query).filter(e => allowedFilters.indexOf(e) !== -1)
        console.error(filterKeys)
        if (filterKeys.length > 0) {
            query.where = {}
            for (const key of filterKeys) {
                let value = req.query[key]
                if (key === 'vitezaMaxima' || key === 'masa') {
                    query.where[key] = { [Op.eq]: parseFloat(value) }
                }
                else {
                    query.where[key] = { [Op.like]: `${value}` }
                }

            }
            console.log(query.where)
        }

        const sortField = req.query.sortField;
        let sortOrder = 'ASC'
        if (req.query.sortOrder && req.query.sortOrder === '-1') {
            sortOrder = 'DESC'
        }

        if (req.query.limit) {
            limit = parseInt(req.query.limit)
        }

        if (sortField) {
            query.order = [[sortField, sortOrder]]
        }

        if (!isNaN(parseInt(req.query.page))) {
            query.limit = limit
            query.offset = limit * parseInt(req.query.page)
        }

        const records = await Spacecraft.findAll(query)

        res.status(200).json({ records })
    } catch (e) {
        console.warn(e)
        res.status(500).json({ message: serverError })
    }
})

app.post('/spacecrafts', async (req, res) => {
    try {
        await Spacecraft.create(req.body)
        res.status(201).json({ message: "Spacecraft created" })
    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.get('/spacecrafts/:sid', async (req, res) => {
    try {
        const spacecraft = await Spacecraft.findByPk(req.params.sid, { include: Astronaut })
        if (spacecraft) {
            res.status(200).json(spacecraft)
        } else {
            res.status(404).json({ message: "Spacecraft not found" })
        }

    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.put('/spacecrafts/:sid', async (req, res) => {
    try {
        const spacecraft = await Spacecraft.findByPk(req.params.sid)
        if (spacecraft) {
            await spacecraft.update(req.body, { fields: ['nume', 'vitezaMaxima', 'masa'] })
            res.status(202).json({ message: "Spacecraft updated" })
        } else {
            res.status(404).json({ message: serverError })
        }

    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.delete('/spacecrafts/:sid', async (req, res) => {
    try {
        const spacecraft = await Spacecraft.findByPk(req.params.sid)
        if (spacecraft) {
            await spacecraft.destroy()
            res.status(202).json({ message: "Spacecraft deleted" })
        } else {
            res.status(404).json({ message: serverError })
        }

    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.get('/spacecrafts/:sid/astronauts', async (req, res) => {
    try {
        const spacecraft = await Spacecraft.findByPk(req.params.sid)
        if (spacecraft) {
            const astronauts = await spacecraft.getAstronauts()
            res.status(200).json(astronauts)
        } else {
            res.status(404).json({ message: "Astronauts not found" })
        }

    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.post('/spacecrafts/:sid/astronauts', async (req, res) => {
    try {
        const spacecraft = await Spacecraft.findByPk(req.params.sid)
        if (spacecraft) {
            const astronaut = req.body
            astronaut.spacecraftId = spacecraft.id
            await Astronaut.create(astronaut)
            res.status(201).json({ message: "Astronaut created" })
        } else {
            res.status(404).json({ message: "Astronauts not found" })
        }

    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.get('/spacecrafts/:sid/astronauts/:aid', async (req, res) => {
    try {
        const spacecraft = await Spacecraft.findByPk(req.params.sid)
        if (spacecraft) {
            const astronauts = await spacecraft.getAstronauts(({ where: { id: req.params.aid } }))
            const astronaut = astronauts.shift()
            if (astronaut) {
                res.status(200).json(astronaut)
            } else {
                res.status(404).json({ message: "Astronaut not found" })
            }
        } else {
            res.status(404).json({ message: "Spacecraft not found" })
        }

    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.put('/spacecrafts/:sid/astronauts/:aid', async (req, res) => {
    try {
        const spacecraft = await Spacecraft.findByPk(req.params.sid)
        if (spacecraft) {
            const astronauts = await spacecraft.getAstronauts(({ where: { id: req.params.aid } }))
            const astronaut = astronauts.shift()
            if (astronaut) {
                await astronaut.update(req.body)
                res.status(202).json({ message: "Astronaut updated" })
            } else {
                res.status(404).json({ message: "Astronaut not found" })
            }
        } else {
            res.status(404).json({ message: "Spacecraft not found" })
        }

    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.delete('/spacecrafts/:sid/astronauts/:aid', async (req, res) => {
    try {
        const spacecraft = await Spacecraft.findByPk(req.params.sid)
        if (spacecraft) {
            const astronauts = await spacecraft.getAstronauts(({ where: { id: req.params.aid } }))
            const astronaut = astronauts.shift()
            if (astronaut) {
                await astronaut.destroy(req.body)
                res.status(202).json({ message: "Astronaut deleted" })
            } else {
                res.status(404).json({ message: "Astronaut not found" })
            }
        } else {
            res.status(404).json({ message: "Spacecraft not found" })
        }

    } catch (err) {
        console.warn(err)
        res.status(500).json({ message: serverError })
    }
})

app.listen(process.env.PORT, async () => {
    await sequelize.sync({ alter: true })
})