// npm install express, puis inclure express...
const express = require('express')
// Initialiser les sessions
const session = require('express-session')
// Faire le lien entre la session du navigateur et la base de données
const MongoStore = require('connect-mongo')(session)
// Affichage de messages flash
const flash = require('connect-flash')
// Possibilité d'utiliser les balises html dans les posts
const markdown = require('marked')
// Et de nettoyer les balises HTML, retirer les scripts...
const sanitizeHTML = require('sanitize-html')
// ... et l'appeler
const app = express()

let sessionOptions = session({
    secret: "Javacsript is soooooooo coooooool",
    store: new MongoStore({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
    }
})

// Inclure les fichiers nécessaires
const router = require('./router')

// Use session params
app.use(sessionOptions)
// Use flash messages
app.use(flash())
// Run this function for every request so that user session data is used from any page and function
app.use(function(req, res, next) {
    // Make our markdown function available from within ejs templates
    res.locals.filterUserHTML = function(content) {
        return sanitizeHTML(markdown(content), {allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'bold', 'i', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'], allowedAttributes: {}})
    }
    // Make all error and success flash messages available from all templates
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")
    // Make user session data available from within view template
    res.locals.user = req.session.user
    // Make current user id available on the req object
    if (req.session.user) {req.visitorId = req.session.user._id} else {req.visitorId = 0}
    next()
})
// Add user submitted data to route
app.use(express.urlencoded({extended: false}))
app.use(express.json())
// Définition des routes
app.use('/', router)
// Indiquer à express qu'on utilisera le dossier 'public'
app.use(express.static('public'))
// For views (1st arg), look into the folder 'views' (2nd arg)
app.set('views', 'views')
// npm install ejs , puis configurer le moteur à utiliser pour les views
app.set('view engine', 'ejs')

const server = require('http').createServer(app)
const io = require('socket.io')(server)

io.use(function(socket, next) {
    sessionOptions(socket.request, socket.request.res, next)
})

io.on('connection', function(socket) {
    if (socket.request.session.user) {
        let user = socket.request.session.user

        socket.emit('welcome', {username: user.username, avatar: user.avatar})

        socket.on('chatMessageFromServer', function(data) {
            // Emit the event to all connected users except the one who sent it
            socket.broadcast.emit('chatMessageFromServer', {
                message: sanitizeHTML(data.message, {allowedTags: [], allowedAttributes: {}}), 
                username: user.username, 
                avatar: user.avatar})
        })
    }
})

module.exports = server