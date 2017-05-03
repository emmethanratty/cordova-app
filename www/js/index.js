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
var myWindow;

var curIcon = L.ExtraMarkers.icon({
    icon: 'fa-crosshairs',
    iconColor: 'white',
    markerColor: 'blue',
    shape: 'square',
    prefix: 'fa'
});

var walksicon= L.ExtraMarkers.icon({
    icon: 'fa-binoculars',
    iconColor: 'white',
    markerColor: 'red',
    shape: 'square',
    prefix: 'fa'
});


function onLoad() {
    console.log("In onLoad.");
    document.addEventListener('deviceready', onDeviceReady, false);
}

function onDeviceReady() {
    console.log("In onDeviceReady.");

    $("#btn-login").on("touchstart", loginPressed);
    $("#sp-logout").on("touchstart", logoutPressed);
    $("#btn-register").on("touchstart", reg_direct);

    if (localStorage.lastUserName && localStorage.lastUserPwd) {
        $("#in-username").val(localStorage.lastUserName);
        $("#in-password").val(localStorage.lastUserPwd);
    }

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
    navigator.notification.alert(message, null, "WMAP 2017", "OK");
}

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

function setMapToCurrentLocation() {
    console.log("In setMapToCurrentLocation.");
    if (localStorage.lastKnownCurrentPosition) {
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        var myLatLon = L.latLng(myPos.coords.latitude, myPos.coords.longitude);
        L.marker(myLatLon, {icon: curIcon}).addTo(map).bindPopup("<b>This is You</b>");
        map.flyTo(myLatLon, 15);
    }
}

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

function myGeoPosition(p) {
    this.coords = {};
    this.coords.latitude = p.coords.latitude;
    this.coords.longitude = p.coords.longitude;
    this.coords.accuracy = (p.coords.accuracy) ? p.coords.accuracy : 0;
    this.timestamp = (p.timestamp) ? p.timestamp : new Date().getTime();
}

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

function walks(){

    map.remove();
    makeBasicMap();
    getCurrentlocation();
    setMapToCurrentLocation();

    
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["walks"]
    }).done(function (data, status, xhr) {
        
        
        var walksJson = JSON.parse(data.data);
        var ratingJson = JSON.parse(data.rating);
        var single_rating = "No Rating";

        for(var i=0; i < walksJson.length; i++){
            var coord = L.latLng(walksJson[i].latitude,walksJson[i].longitude );

            for(var j = 0; j < ratingJson.length; j++){
                if(walksJson[i].poiID == ratingJson[j].id){
                    single_rating = ratingJson[j].average + "/5";
                }
            }

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

function rating(id_prompt){
    var rating_prompt = prompt("Please enter a rating out of 5:", "");

    if(rating_prompt == ""){
        alert("Nothing Entered")
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
    } else{
        alert("Only Enter 1 - 5")
    }

    walks();
   

}


function directions(lat, long) {

    map.closePopup();
    walks();

    var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);

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

function listreviews(id_prompt){

    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["listreviews"],
        data: {
                walk_id: id_prompt,
            }
    }).done(function (data, status, xhr) {

        var ratingJson = JSON.parse(data.rating_list);
        var html = "";

        var div = document.getElementById("reviews-page");

        for(var i = 0; i<ratingJson.length; i++){
           html +=  "<b>Username: </b>" + ratingJson[i].username + " <b>Rating: </b> " + ratingJson[i].rating + "<br><br>"
        }
        html +="<button onclick=revertToMap()>Close</button>"

        div.innerHTML = html;

        $.mobile.navigate("#reviews-page");

    }).fail(function (xhr, status, error) {
        alert("Listing Failed");
    });

}

function revertToMap(){
    $.mobile.navigate("#map-page");
}


function reg_direct(){
    $.mobile.navigate("#register-page");
}

function registration(){

    var username = document.getElementById('in-username-r');
    var password = document.getElementById('in-password-r');
    var password2 = document.getElementById('in-password2');
    var firstName = document.getElementById('in-first-name');
    var lastName = document.getElementById('in-last-name');
    var email = document.getElementById('in-email');


    if(username.value == "" || password.value == "" || password2.value == "" || firstName.value == "" || lastName.value == "" || email.value == ""){
        alert("Please Enter all Fields")
    }else{

        if(password.value == password2.value){
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





