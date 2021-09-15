const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const jwt = require('jsonwebtoken')

exports.apiLogin = (req, res) => {
    let user = new User(req.body)
    user.login()
            .then(function(result) {
                res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: '7d'}))
            })
            .catch(function(e) {
                res.json("Forbidden.")
            })
}

exports.apiMustBeLoggedIn = (req, res, next) => {
    try {
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
        next()
    } catch {
        res.json("You must provide a valid token.")
    }
}

exports.apiGetPostsByUsername = async (req, res) => {
    try {
        let authorDoc = await User.findByUsername(req.params.username)
        let posts = await Post.findByAuthorId(authorDoc._id)
        res.json(posts)
    } catch {
        res.json("Invalid user requested.")
    }
}

exports.doesEmailExist = async (req, res) => {
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}

exports.doesUsernameExist = (req, res) => {
    User.findByUsername(req.body.username)
            .then(() => res.json(true))
            .catch(() => res.json(false))
}

exports.home = async (req, res) => {
    // Appel à la view 'home-guest' via le moteur de rendu ejs
    // (dont fait partie la méthode render)
    if (req.session.user) {
        // Fetch feed of posts for current user
        let posts = await Post.getFeed(req.session.user._id)
        res.render('home-dashboard', {posts: posts})
    } else {
        // Flash sends back errors AND deletes info from mongo db
        res.render('home-guest', {regErrors: req.flash('regErrors')})
    }
}

exports.ifUserExists = (req, res, next) => {
    User.findByUsername(req.params.username)
            .then(function(userDocument) {
                req.profileUser = userDocument
                next()
            })
            .catch(function() {
                res.render('404')
            })
}

exports.login = (req, res) => {
    let user = new User(req.body)
    user.login()
            .then(function(result) {
                req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
                // Force to save so that we are sure the redirect comes after the session.user
                req.session.save(function() {
                    res.redirect('/')
                })
            })
            .catch(function(e) {
                req.flash('errors', e)
                // Force to save so that we are sure the redirect comes after the flash
                req.session.save(function() {
                    res.redirect('/')
                })
            })
}

exports.logout = (req, res) => {
    req.session.destroy(function() {
        res.redirect('/')
    })
    
}

exports.mustBeLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next()
    } else {
        req.flash("errors", "You must be logged in to perform that action.")
        // Force to save so that we are sure the redirect comes after the flash
        req.session.save(function() {
            res.redirect('/')
        })
    }
}

exports.profileFollowersScreen = async function(req, res) {
    try {
        let followers = await Follow.getFollowersById(req.profileUser._id)
        res.render('profile-followers', {
            currentPage: "followers",
            followers: followers,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {
                postCount: req.postCount,
                followerCount: req.followerCount,
                followingCount: req.followingCount
            }
        })
    } catch {
        res.render('404')
    }
}

exports.profileFollowingScreen = async function(req, res) {
    try {
        let following = await Follow.getFollowingById(req.profileUser._id)
        res.render('profile-following', {
            currentPage: "following",
            following: following,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {
                postCount: req.postCount,
                followerCount: req.followerCount,
                followingCount: req.followingCount
            }
        })
    } catch {
        res.render('404')
    }
}

exports.profilePostsScreen = (req, res) => {
    // Ask our post model for posts by a certain author id
    Post.findByAuthorId(req.profileUser._id)
            .then(function(posts) {
                res.render('profile', {
                    currentPage: "posts",
                    posts: posts,
                    profileUsername: req.profileUser.username,
                    profileAvatar: req.profileUser.avatar,
                    isFollowing: req.isFollowing,
                    isVisitorsProfile: req.isVisitorsProfile,
                    counts: {
                        postCount: req.postCount,
                        followerCount: req.followerCount,
                        followingCount: req.followingCount
                    },
                    title: `Profile for ${req.profileUser.username}`
                })
            })
            .catch(function() {
                res.render('404')
            })
}

exports.register = (req, res) => {
    let user = new User(req.body)
    user.register()
            .then(() => {
                req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
                // Force to save so that we are sure the redirect comes after the flash
                req.session.save(function() {
                    res.redirect('/')
                })
            })
            .catch((regErrors) => {
                regErrors.forEach(function(error) {
                    req.flash('regErrors', error)
                })
                // Force to save so that we are sure the redirect comes after the flash
                req.session.save(function() {
                    res.redirect('/')
                })
            })
}

exports.sharedProfileData = async (req, res, next) => {
    let isVisitorsProfile = false
    let isFollowing = false
    if (req.session.user) {
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id)
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
    }

    req.isVisitorsProfile = isVisitorsProfile
    req.isFollowing = isFollowing

    // Retrieve post, follower and following counts
    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    let followerCountPromise = Follow.countFollowersById(req.profileUser._id)
    let followingCountPromise = Follow.countFollowingById(req.profileUser._id)
    let [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise])
    req.postCount = postCount
    req.followerCount = followerCount
    req.followingCount = followingCount

    next()
}