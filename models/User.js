// Inclure le package bcrypt pour hash des mots de passe
const bcrypt = require('bcryptjs')
// Inclure le package md5 pour gravatar
const md5 = require('md5')
// Inclure le fichier de connection à la base de données pour CRUD
// et récupérer la collection users
const usersCollection = require('../db').db().collection('users')
// Inclure le package validator pour validation (email, alphanumeric...)
const validator = require("validator")

let User = function(data, getAvatar) {
    this.data = data
    this.errors = []
    if (getAvatar === undefined) {getAvatar = false}
    if (getAvatar) {this.getAvatar()}
}

User.prototype.cleanUp = function() {
    // Clean data that is not a string (malicious user could type in an object or function for example)
    if (typeof this.data.username !== "string") {this.data.username = ""}
    if (typeof this.data.email !== "string") {this.data.email = ""}
    if (typeof this.data.password !== "string") {this.data.password = ""}

    // Get rid of any boggus property
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password // Space is a valid character in a password
    }
}

User.prototype.getAvatar = function() {
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.prototype.login = function() {
    return new Promise((resolve, reject) => {
        // Using an arrow function instead of the keyword 'function' allows us
        // to use the 'this' keyword within the function, otherwise the 'this' keyword
        // would have pointed to the function's context rather than the User object
        this.cleanUp()
        usersCollection.findOne({username: this.data.username})
            .then((attemptedUser) => {
                if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                    // attemptedUser will only be true if the username exists
                    this.data = attemptedUser
                    this.getAvatar()
                    resolve("Congrats")
                } else {
                    reject("Invalid username / password.")
                }
            })
            .catch(() => {
                reject("Please try again later.")
            })
    })
}

User.prototype.register = function() {
    return new Promise(async (resolve, reject) => {
        // Using an arrow function instead of the keyword 'function' allows us
        // to use the 'this' keyword within the function, otherwise the 'this' keyword
        // would have pointed to the function's context rather than the User object

        // Step 1 : Validate user data
        this.cleanUp()
        await this.validate()
    
        // Step 2 : Only if there are no validation errors,
        //    then save the user data into the database
        if (!this.errors.length) {
            // Hash user password
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password, salt)
            // Store user in database
            await usersCollection.insertOne(this.data)
            this.getAvatar()
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

User.prototype.validate = function() {
    return new Promise(async (resolve, reject) => {
        // Using an arrow function instead of the keyword 'function' allows us
        // to use the 'this' keyword within the function, otherwise the 'this' keyword
        // would have pointed to the function's context rather than the User object

        // Millions of way to do this, no right or wrong answers
        if (this.data.username === "") {this.errors.push("You must provide a username")}
        if (this.data.username !== "" && !validator.isAlphanumeric(this.data.username)) {this.errors.push("Username can only contain letters and numbers")}
        if (!validator.isEmail(this.data.email)) {this.errors.push("You must provide a valid email address")}
        if (this.data.password === "") {this.errors.push("You must provide a password")}
        if (this.data.password.length > 0 && this.data.password.length < 12) {this.errors.push("Password must be at least 12 characters")}
        if (this.data.password.length > 50) {this.errors.push("Password cannot exceed 50 characters")}
        if (this.data.username.length > 0 && this.data.username.length < 3) {this.errors.push("Username must be at least 3 characters")}
        if (this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 characters")}
    
        // Only if username is valid then check to see if it's already taken
        if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
            let usernameExists = await usersCollection.findOne({username: this.data.username})
            if (usernameExists) {this.errors.push("Username already taken")}
        }
        
        // Only if email is valid then check to see if it's already taken
        if (validator.isEmail(this.data.email)) {
            let emailExists = await usersCollection.findOne({email: this.data.email})
            if (emailExists) {this.errors.push("An account already exists with this email")}
        }

        resolve()
    })
}

User.doesEmailExist = function(email) {
    return new Promise(async function(resolve, reject) {
        if (typeof(email) != "string") {
            resolve(false)
            return
        }

        let user = await usersCollection.findOne({email: email})
        if (user) {
            resolve(true)
        } else {
            resolve(false)
        }
    })
}

User.findByUsername = function(username) {
    return new Promise(function(resolve, reject) {
        if (typeof username !== "string") {
            reject()
            return
        }

        usersCollection.findOne({username: username})
                            .then(function(userDoc) {
                                if (userDoc) {
                                    userDoc = new User(userDoc, true)
                                    userDoc = {
                                        _id: userDoc.data._id,
                                        username: userDoc.data.username,
                                        avatar: userDoc.avatar
                                    }
                                    resolve(userDoc)
                                } else {
                                    reject()
                                }
                            })
                            .catch(function() {
                                reject()
                            })
    })
}

module.exports = User