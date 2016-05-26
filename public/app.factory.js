(function() {
    'use strict';

    angular.module('RedditClone')
        .factory('redditServices', factory);


    factory.$inject = ['$http', '$window', '$location'];

    function factory($http, $window, $location) {

        var service = {
            allPostings: getAllPostings,
            allComments: getAllComments,
            voteUp: postVoteUp,
            voteDown: postVoteDown,
            addNewComment: postAddNewComment,
            newPosting,
            signup,
            login
        };

        return service;

        function getAllPostings() {
            return $http.get('http://localhost:3000/api/postings')
                .then(function(res) {
                    return res;
                })
                .catch(function(err) {
                    return err;
                });
        }

        function newPosting(posting) {
            let data = {
                    'author_id': 1,
                    'title': posting.title,
                    'image_url': posting.image_url,
                    'posting': posting.posting
                };

            return $http.post('http://localhost:3000/api/newPosting', data)
                .then(function(res) {
                    return res;
                })
                .catch(function(err) {
                    return err;
                });
        }

        function getAllComments() {
            return $http.get('http://localhost:3000/api/comments')
                .then(function(res) {
                    return res;
                })
                .catch(function(err) {
                    return err;
                });
        }

        function postAddNewComment(comment) {
            return $http.post('http://localhost:3000/api/newComment', {
                    'author_id': comment.newComment.author_id,
                    'comment': comment.newComment.comment,
                    'posting_id': comment.post_id
                })
                .then(function(res) {
                    return res;
                })
                .catch(function(err) {
                    return err;
                });
        }

        function postVoteUp(post) {
            post.votes++;
            return $http.post('http://localhost:3000/api/postings/votes', {
                    'id': post.id,
                    'votes': post.votes
                })
                .then(function(res) {
                    return res;
                })
                .catch(function(err) {
                    return err;``
                });
        }

        function postVoteDown(post) {
            post.votes--;
            return $http.post('http://localhost:3000/api/postings/votes', {
                    'id': post.id,
                    'votes': post.votes
                })
                .then(function(res) {
                    return res;
                })
                .catch(function(err) {
                    return err;
                });
        }

        function signup(data) {
            return $http.post('http://localhost:3000/api/signup', data)
                .then(function(res) {
                    $window.localStorage.setItem('token', res.data.token);
                    $location.path('/');
                    return res;
                })
                .catch(function(err) {
                    return err;
                });
        }

        function login(data) {
            console.log(data);
            return $http.post('http://localhost:3000/api/login', data)
                .then(function(res) {
                    $window.localStorage.setItem('token', res.data.token);
                    $location.path('/');
                    return res;
                })
                .catch(function(err) {
                    return err;
                });
        }

    }

}());
