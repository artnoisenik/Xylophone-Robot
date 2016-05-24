const knex = require('knex')
const knexFile = require('../knexfile')
const env = process.env.NODE_ENV || 'development'

module.exports= knex(knexFile[env])
