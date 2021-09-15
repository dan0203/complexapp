const dotenv = require('dotenv')
dotenv.config()
const mongodb = require('mongodb')

mongodb.connect(process.env.CONNECTIONSTRING, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, client) {
    module.exports = client
    // The application won't start until we have a connection to the database
    const app = require('./app')
    // L'application écoute sur le port 3000 en attente d'action
    app.listen(process.env.PORT)
})