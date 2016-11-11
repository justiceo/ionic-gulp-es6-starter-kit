export default class User {
    constructor(JWT, AppConstants, $window, $state, $http, $q, $log) {
        "ngInject";

        this._AppConstants = AppConstants;
        this._$window = $window;
        this._$state = $state;
        this._$http = $http;
        this._JWT = JWT;
        this._$q = $q;
        this._$log = $log;

        // Object to store our user properties
        this.current = null;
    }

    // Try to authenticate by registering or logging in
    attemptAuth(type, credentials) {
        let route = (type === "login") ? "/Token" : "";
        credentials.grant_type = "password";

        var loginData = {
            grant_type: 'password',
            username: credentials.username,
            password: credentials.password
        };

        return this._$http({
            url: this._AppConstants.host + route,
            method: "POST",
            data: loginData,
            headers: {
                'Content-Type': "application/x-www-form-urlencoded"
            },
            transformRequest: function(obj) {
                let str = [];
                for(var p in obj)
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            }
        }).then(
            // On success, save the token and then return the data
            (response) => {
                // Set the JWT token
                this._JWT.save(response.data.access_token, response.data.userName);
                // Load and Store the user's info for easy lookup

                this._$http.get(this._AppConstants.api + "/Users/GetUserById/?id=" + response.data.userName).then(
                    userInfo => {
                        this._setCurrentUserInfo(userInfo.data);
                    }
                );
                return this._$q.resolve(response);
            },
            (error) => {
                return this._$q.reject(error);
            }
        );
    }

    getToken() {
        return this._JWT.get();
    }

    verifyAuth() {
        // Should we return the promise at different points in here?
        // Unclear atm.
        let deferred = this._$q.defer();

        // Check for JWT token first
        if (!this._JWT.get()) {
            this._$log.log("USER SERV: Auth verification failed: No Jwt token found");
            deferred.resolve(false);
            return deferred.promise;
        }

        // If there's a JWT & user is already set
        if (this.current) {
            this._$log.log("USER SERV: Auth verified: Jwt token and user object found");
            deferred.resolve(true);

            // If current user isn't set, get it from the server.
            // If server doesn't 401, set current user & resolve promise.
        } else {
            this._$log.log("USER SERV: JWT found, attempting to request user object from server");
            this._$http({
                url: this._AppConstants.api + "/Users/GetUserById/?id=" + this._JWT.getUserId(),
                method: "GET",
            }).then(
                (response) => {
                    // todo: set CurrentUserInfo(response.data);
                    deferred.resolve(true);
                },
                // If an error happens, that means the user's token was invalid.
                (error) => {
                    this._JWT.destroy();
                    deferred.resolve(false);
                    this._$log.log("The user's token was invalid: \n" + error.message);
                }
                // Reject automatically handled by auth interceptor
                // Will boot them to homepage
            );
        }

        return deferred.promise;
    }

    // This methods will be used by UI-Router resolves
    ensureAuthIs(bool) {
        this._$log.log("USER SERV: About to ensure auth is " + bool);
        let deferred = this._$q.defer();

        this.verifyAuth().then((authValid) => {
            // if it's the opposite, redirect home
            if (authValid !== bool) {
                this._$state.go("app.login");
                this._$log.log("USER SERV: Auth resolved as false");
                deferred.resolve(false);
            } else {
                this._$log.log("USER SERV: Auth resolved as true");
                deferred.resolve(true);
            }
        });

        return deferred.promise;
    }

    logout() {
        this.current = null;
        this._JWT.destroy();
        // Do a hard reload of current state to ensure all data is flushed
        this._$state.go(this._$state.$current, null, {reload: true});
    }
}
