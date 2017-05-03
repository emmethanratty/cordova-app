var HOST = "http://46.101.32.194:8000"; // ask me for this in class

var URLS = {
    login: "/rest/tokenlogin/",
    userme: "/rest/userme/",
    updateposition: "/rest/updateposition/",
    walks: "/rest/walks/",
    rating: "/rest/rating/",
    clear: "/rest/clear/",
    listreviews: "/rest/listreviews/",
    registration: "/rest/registration/",
};

var map;

// icon for the users position
var curIcon = L.ExtraMarkers.icon({
    icon: 'fa-crosshairs',
    iconColor: 'white',
    markerColor: 'blue',
    shape: 'square',
    prefix: 'fa'
});

// icon for the walks
var walksicon= L.ExtraMarkers.icon({
    icon: 'fa-binoculars',
    iconColor: 'white',
    markerColor: 'red',
    shape: 'square',
    prefix: 'fa'
});


//initialize the app
function onLoad() {
    console.log("In onLoad.");
    document.addEventListener('deviceready', onDeviceReady, false);
}

// when the device is ready load the appropriate pages
function onDeviceReady() {
    console.log("In onDeviceReady.");

    // buttons for loging in and registering
    $("#btn-login").on("touchstart", loginPressed);
    $("#sp-logout").on("touchstart", logoutPressed);
    $("#btn-register").on("touchstart", reg_direct);

    // check to assign the last user
    if (localStorage.lastUserName && localStorage.lastUserPwd) {
        $("#in-username").val(localStorage.lastUserName);
        $("#in-password").val(localStorage.lastUserPwd);
    }

    // create the map
    $(document).on("pagecreate", "#map-page", function (event) {
        console.log("In pagecreate. Target is " + event.target.id + ".");

        $("#goto-currentlocation").on("touchstart", function () {
            getCurrentlocation();
        });

        $("#walks").on("touchstart", function () {
            walks();
        });

        $("#update_database").on("touchstart", function () {
            update_database();
        });

        $("#clear").on("touchstart", function () {
            clear();
        });

        $("#map-page").enhanceWithin();

        makeBasicMap();
        getCurrentlocation();
    });

    $(document).on("pageshow", function (event) {
        console.log("In pageshow. Target is " + event.target.id + ".");
        // if (!localStorage.authtoken) {
        //     $.mobile.navigate("#login-page");
        // }
        setUserName();
    });

    $(document).on("pageshow", "#map-page", function () {
        console.log("In pageshow / #map-page.");
        map.invalidateSize();
    });

    $('div[data-role="page"]').page();

    console.log("TOKEN: " + localStorage.authtoken);
    if (localStorage.authtoken) {
        $.mobile.navigate("#map-page");
    } else {
        $.mobile.navigate("#login-page");
    }
}

// login pressed function to log in
function loginPressed() {
    console.log("In loginPressed.");
    $.ajax({
        type: "GET",
        url: HOST + URLS["login"],
        data: {
            username: $("#in-username").val(),
            password: $("#in-password").val()
        }
    }).done(function (data, status, xhr) {
        localStorage.authtoken = localStorage.authtoken = "Token " + xhr.responseJSON.token;
        localStorage.lastUserName = $("#in-username").val();
        localStorage.lastUserPwd = $("#in-password").val();

        $.mobile.navigate("#map-page");
    }).fail(function (xhr, status, error) {
        var message = "Login Failed\n";
        if ((!xhr.status) && (!navigator.onLine)) {
            message += "Bad Internet Connection\n";
        }
        message += "Status: " + xhr.status + " " + xhr.responseText;
        showOkAlert(message);
        logoutPressed();
    });
}

// logout pressed to log out
function logoutPressed() {
    console.log("In logoutPressed.");
    localStorage.removeItem("authtoken");
    $.mobile.navigate("#login-page");
    // $.ajax({
    //     type: "GET",
    //     headers: {"Authorization": localStorage.authtoken}
    //     // url: HOST + URLS["logout"]
    // }).always(function () {
    //     localStorage.removeItem("authtoken");
    //     $.mobile.navigate("#login-page");
    // });
}

function showOkAlert(message) {
    navigator.notification.alert(message, null, "Walks APP", "OK");
}

// function to get the current location 
function getCurrentlocation() {
    console.log("In getCurrentlocation.");
    var myLatLon;
    var myPos;

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            // myLatLon = L.latLng(pos.coords.latitude, pos.coords.longitude);
            myPos = new myGeoPosition(pos);
            localStorage.lastKnownCurrentPosition = JSON.stringify(myPos);

            setMapToCurrentLocation();
            updatePosition();
        },
        function (err) {
        },
        {
            enableHighAccuracy: true
            // maximumAge: 60000,
            // timeout: 5000
        }
    );
}

// function to set the current location
function setMapToCurrentLocation() {
    console.log("In setMapToCurrentLocation.");
    if (localStorage.lastKnownCurrentPosition) {
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        var myLatLon = L.latLng(myPos.coords.latitude, myPos.coords.longitude);
        L.marker(myLatLon, {icon: curIcon}).addTo(map).bindPopup("<b>This is You</b>");
        //map.flyTo(myLatLon, 15);
        //map.panTo(new L.LatLng(myPos.coords.latitude,  myPos.coords.longitude));
        map.setView(new L.LatLng(myPos.coords.latitude,  myPos.coords.longitude), 15);
    }
}

// function to update the current location
function updatePosition() {
    console.log("In updatePosition.");
    if (localStorage.lastKnownCurrentPosition) {
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        $.ajax({
            type: "PATCH",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": localStorage.authtoken
            },
            url: HOST + URLS["updateposition"],
            data: {
                lat: myPos.coords.latitude,
                lon: myPos.coords.longitude
            }
        }).done(function (data, status, xhr) {
            showOkAlert("Position Updated");
        }).fail(function (xhr, status, error) {
            var message = "Position Update Failed\n";
            if ((!xhr.status) && (!navigator.onLine)) {
                message += "Bad Internet Connection\n";
            }
            message += "Status: " + xhr.status + " " + xhr.responseText;
            showOkAlert(message);
        }).always(function () {
            $.mobile.navigate("#map-page");
        });
    }
}

// function to initialize the map
function makeBasicMap() {
    console.log("In makeBasicMap.");
    map = L.map("map-var", {
        zoomControl: false,
        attributionControl: false
    }).fitWorld();
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
	    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    $("#leaflet-copyright").html("Leaflet | Map Tiles &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors");
}

// function to get the geo location
function myGeoPosition(p) {
    this.coords = {};
    this.coords.latitude = p.coords.latitude;
    this.coords.longitude = p.coords.longitude;
    this.coords.accuracy = (p.coords.accuracy) ? p.coords.accuracy : 0;
    this.timestamp = (p.timestamp) ? p.timestamp : new Date().getTime();
}

// fucntion to set the user name
function setUserName() {
    console.log("In setUserName.");
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["userme"]
    }).done(function (data, status, xhr) {
        $(".sp-username").html(xhr.responseJSON.properties.username);
    }).fail(function (xhr, status, error) {
        $(".sp-username").html("");
    });
}

// function to query the API and database and set the markers on the map
function walks(){
    // initialize the map again
    map.remove();
    makeBasicMap();
    getCurrentlocation();
    setMapToCurrentLocation();

    // call the walks backend function
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["walks"]
    }).done(function (data, status, xhr) {
        
        // parse the retured JSON
        var walksJson = JSON.parse(data.data);
        var ratingJson = JSON.parse(data.rating);
        var single_rating = "No Rating";

        // for loop to loop through walks, set the markers and initialize the popups
        for(var i=0; i < walksJson.length; i++){
            var coord = L.latLng(walksJson[i].latitude,walksJson[i].longitude );

            // for loop to get the walks rating
            for(var j = 0; j < ratingJson.length; j++){
                if(walksJson[i].poiID == ratingJson[j].id){
                    single_rating = ratingJson[j].average + "/5";
                }
            }

            // check to see if walk has a contact number of not and set the html accordingly 
            if(walksJson[i].contactNumber == ''){
                var popupContent = "<b> Name</b><br>" + walksJson[i].name + "<br><br>" + "<b>Description</b><br>"+ walksJson[i].description +
                               "<br><br>" + "<b>Address</b><br>"+ walksJson[i].address + "<br><br>" +
                               "<b>Rate</b><br>" + "  " + single_rating + "               " + "<button onclick=rating(" + walksJson[i].poiID + ")>Rate</button>" + "<button onclick=listreviews(" + walksJson[i].poiID + ")>Show Reviews</button>" + "<br><br>" +
                               "<button onclick=directions(" + walksJson[i].latitude + "," + walksJson[i].longitude + ")>Directions</button>";
            }else{
                var popupContent = "<b> Name</b><br>" + walksJson[i].name + "<br><br>" + "<b>Description</b><br>"+ walksJson[i].description +
                               "<br><br>" + "<b>Contact</b><br>"+ walksJson[i].contactNumber + "<br><br>" + "<b>Address</b><br>"+ walksJson[i].address + "<br><br>" +
                               "<b>Rate</b><br>" + "  " +  single_rating +  "             " + "<button onclick=rating(" + walksJson[i].poiID + ")>Rate</button>" + "<button onclick=listreviews(" + walksJson[i].poiID + ")>Show Reviews</button>" + "<br><br>" +
                               "<button onclick=directions(" + walksJson[i].latitude + "," + walksJson[i].longitude + ")>Directions</button>";
            }


            L.marker(coord, {icon: walksicon}).addTo(map).bindPopup(popupContent);

            single_rating = "No Rating"
        }
    }).fail(function (xhr, status, error) {
        alert("Walks Failed")
    });
}

// functions to get a rating from user and pass the rating to the database
function rating(id_prompt){
    var rating_prompt = prompt("Please enter a rating out of 5:", "");

    // checks to see if a rating was entered
    if(rating_prompt == ""){
        alert("Nothing Entered")

    // check to make sure the rating is between 1 - 5
    }else if(rating_prompt == "1" || rating_prompt == "2" || rating_prompt == "3" || rating_prompt == "4" || rating_prompt == "5"){
        $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["rating"],
        data: {
                rating: rating_prompt,
                rating_id: id_prompt,
                rating_username: localStorage.lastUserName,
            }
        }).done(function (data, status, xhr) {
            alert("Rating added");
        }).fail(function (xhr, status, error) {
            alert("Rating Failed");
        });

        walks();
    } else{
        alert("Only Enter 1 - 5")
    }
}

// function to set the routing for a particul marker
function directions(lat, long) {

    map.closePopup();
    walks();

    // parse current location JSON
    var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);

    // route from the current location to the selected marker
    L.Routing.control({
        waypoints: [
            L.latLng(myPos.coords.latitude,  myPos.coords.longitude),
            L.latLng(lat, long)
        ],
        draggable: false,
        createMarker: function() { return null; },
    }).addTo(map);

    control.hide();
}

// function to get the reviews and list them to the user
function listreviews(id_prompt){

    // passing the user id to the backend
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["listreviews"],
        data:{
                walk_id: id_prompt,
             }
    }).done(function (data, status, xhr) {

        // parse the rating JSON
        var ratingJson = JSON.parse(data.rating_list);
        var html = "";

        // get the empty div
        var div = document.getElementById("reviews-page");

        // prepare the inner html
        for(var i = 0; i<ratingJson.length; i++){
           html +=  "<b>Username: </b>" + ratingJson[i].username + " <b>Rating: </b> " + ratingJson[i].rating + "<br><br>"
        }
        html +="<button onclick=revertToMap()>Close</button>"

        // set the inner html
        div.innerHTML = html;
        $.mobile.navigate("#reviews-page");

    }).fail(function (xhr, status, error) {
        alert("Listing Failed");
    });

}

// function to revert to the map
function revertToMap(){
    $.mobile.navigate("#map-page");
}

// function to redirect to the registration page
function reg_direct(){
    $.mobile.navigate("#register-page");
}

// function to revert to the login
function revertToLogin(){
    $.mobile.navigate("#login-page");
}

// function to pass the registration info to the backend
function registration(){

    // get all inputted elements
    var username = document.getElementById('in-username-r');
    var password = document.getElementById('in-password-r');
    var password2 = document.getElementById('in-password2');
    var firstName = document.getElementById('in-first-name');
    var lastName = document.getElementById('in-last-name');
    var email = document.getElementById('in-email');

    // check to make sure no feilds are empty
    if(username.value == "" || password.value == "" || password2.value == "" || firstName.value == "" || lastName.value == "" || email.value == ""){
        alert("Please Enter all Fields")
    }else{
        // check to see if passwords are the same
        if(password.value == password2.value){

            // Pass the information to the backend
            $.ajax({
                type: "GET",
                url: HOST + URLS["registration"],
                data: {
                        username: username.value,
                        password: password.value,
                        first_name: firstName.value,
                        last_name: lastName.value,
                        email: email.value,
                    }
            }).done(function (data, status, xhr) {
                // redirect back to login page
                alert("Registration Sucessful");	
                $.mobile.navigate("#login-page");
            }).fail(function (xhr, status, error) {
                alert("Registration Failed");
            });
        }else{
            alert("Passwords do no match");
        }

    }
}

    