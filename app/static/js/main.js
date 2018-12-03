var playallSpeed = 2; // Global value for the default Play All Speed
var map; // Map for the Google Map
 /*
  *    The main collection for the front-end functionality of the application. This
  *    houses all of the functions for the polygons (regions on the map) such as
  *    add, hide, show, delete, clearAll, newPolygon, and generateColor.
  */
var polygons = {
    collection: {}, // The list of all the polygons.
    IPPolys: {}, // The list of only interpolated polygons. For use in playing multiple
                 //  polygons at the same time.
    /*
     *    Add a new polyhon to the polygons.collection and display it on the map
     *    on the front-end.
     */
    add: function(overlay) {
        return polygons.newPolygon(overlay);
    },
    /*
     *    Hide a polygon from the application. Also removes it from a back-end
     *    list to prevent interacting with the incorrect functions.
     */
    hide: function(polygon) {
        polygon.visible = false;
        if (polygon.selected) {
            clearPolygonSelectBorder(polygon.id);
            polygon.selected = false;
            managePolygon(polygon.id, "select");
        }
        polygon.setMap(null);
    },
    /*
     *    Opposite of hide. Reveals the polygon.
     */
    show: function(polygon) {
        polygon.visible = true;
        polygon.setMap(map);
    },
    /*
     *    Removes the polygon from the map and collection.
     */
    delete: function(polygon) {
        polygon.setMap(null);
        delete this.collection[polygon.id];
    },
    /*
     *    Removes all the polygons in the collection at the same time.
     */
    clearAll: function() {
        for (polygonID in this.collection) {
            managePolygon(polygonID, "delete", null);
            polygons.delete(polygons.collection[polygonID]);
        }
        clearSession();
    },
    /*
     *    Generates all the relevant information to create a polygon and display
     *    it on the map.
     */
    newPolygon: function(poly, polyID, is3D, start, end) {
        if (polyID == null)
            polyID = 0;
        var shape = poly;
        shape.type = "polygon"; // Tyope of shape is a polygon (any number of sides or any kind of geometric shape)
        shape.path = poly.getPaths(); // Paths to paint the border of the polygon
        shape.id = polyID == 0 ? guid() : polyID; // Generate a unique ID
        shape.selected = false; // Default selected value
        shape.visible = true; // Default visible
        shape.is3DPolygon = false; // Default not 3D Polygon
        // Interpolated values
        if (is3D) {
            shape.is3DPolygon = true;
            shape.startTime = start;
            shape.endTime = end;
            shape.interpolatedRegionID = 0;
        }
        this.collection[shape.id] = shape;
        google.maps.event.addListener(shape,'click', function() {
            handlePolygonSelect(shape.id);
        });
        google.maps.event.addListener(shape, 'rightclick', function(event) {
            handleContextMenu(event, this);
        });
        shape.setMap(map);
        return shape.id;
    },
    /*
     *    Generate a "random" hex color to assign to the polygon region
     */
    generateColor: function(e) {
        var color = "#";
        for (var x = 0; x < 6; x++) {
            var randNum = Math.floor(Math.random() * (15 - 7) + 7);
            switch(randNum) {
                case 10:
                    color += "A";
                    break;
                case 11:
                    color += "B";
                    break;
                case 12:
                    color += "C";
                    break;
                case 13:
                    color += "D";
                    break;
                case 14:
                    color += "E";
                    break;
                case 15:
                    color += "F";
                    break;
                default:
                    color += randNum.toString();
            }
    }
    return color;
    }
};

/*
 *    Use the s4() function to create a UUID
 */
function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
}

/*
 *    Generate a 4 character long hex string
 */
function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

/*
 *    Initialize the webpage, the google maps plugin and its drawing components,
 *    and the buttons with their functionality.
 */
function initialize() {
    /*
     *    Initalize the Google Maps plugin and features such as drawing and
     *    location on the map.
     */
    var mapProp = {
        // Default location for the google maps (right above Edwardsville roughly)
        center: new google.maps.LatLng(38.7931,-89.9967),
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    // Give the map its properties
    map = new google.maps.Map(document.getElementById("map"), mapProp);
    // Default polygon values for their creation.
    var polyOptions = {
        fillColor : polygons.generateColor(),
        fillOpacity: .8,
        strokeWeight: 3,
        zIndex: 1
    };
    // Values for all of the drawing functionality.
    var drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['polygon']
        },
        polygonOptions: polyOptions
    });
    drawingManager.setMap(map);
    google.maps.event.addListener(drawingManager, "overlaycomplete", function(event) {
        var polygonOptions = drawingManager.get('polygonOptions');
        polygonOptions.fillColor = polygons.generateColor();
        drawingManager.set('polygonOptions', polygonOptions);
        var newID = managePolygon(polygons.add(event.overlay), "add", null);
    });

    /*
     *    Initialize the webpage now and assign functions to the computation
     *    buttons.
     */
    showEmptyRegionList();
    // Ajax post to backend for intersection
    $('#find-intersections').click(function() {
        $.ajax({
            type: "POST",
            url: "/api/find_intersections",
            success: function(data) {
                if (data.success) {
                    generateNewPolygon(data.data, "Intersection");
                    clearPolygonSelection();
                }
            },
            failure: function(data) {
                console.log(data);
            }
        });
    });
    // Ajax post to backend for union
    $('#find-unions').click(function() {
        $.ajax({
            type: "POST",
            url: "/api/find_unions",
            success: function(data) {
                if (data.success) {
                    generateNewPolygon(data.data, "Union");
                    clearPolygonSelection();
                }
            },
            failure: function(data) {
                console.log(data);
            }
        });
    });
    // Ajax post to backend for differences
    $('#find-differences').click(function() {
        $.ajax({
            type: "POST",
            url: "/api/find_difference",
            success: function(data) {
                if (data.success) {
                    generateNewPolygon(data.data, "Difference");
                    clearPolygonSelection()
                }
            },
            failure: function(data) {
                console.log(data);
            }
        });
    });
    // Ajax post to backend for interpolating two regions
    $('#interpolate-regions').click(function() {
        // Hide the inputs after clicking the button
        $('#start-time').addClass("hidden");
        $('#interpolate-inputs-2').addClass("hidden");
        $('#interpolate-inputs-3').addClass("hidden");
        var startTime = $("#start-time").val();
        var endTime = $("#end-time").val();
        data = JSON.stringify(
            {
                "startTime" : startTime,
                "endTime" : endTime
            }
        );
        $.ajax({
            type: "POST",
            url: "/api/find_interpolated_regions",
            data: {"data": data},
            success: function(data) {
                if (data.success) {
                    /**
                     *    Remove the old polygons from the list on the frontend
                     *    only and add the new IPPoly into the list (does not
                     *    remove from a 'selected-regions' list in the backend)
                     */
                    var restoreID = [];
                    for (var polygon in polygons.collection) {
                        if (polygons.collection[polygon].selected) {
                            var button = "#delete-" + polygon;
                            $(button).parent().remove();
                            if (!$("#region-list").children().length) {
                                showEmptyRegionList();
                                $("#clear-regions").addClass("hidden");
                            }
                            restoreID.push(polygon);
                            $("#custom-menu").addClass("hidden");
                            polygons.delete(polygons.collection[polygon]);
                        }
                    }
                    managePolygon(restoreID[0], "delete", null);
                    generateNewPolygon(data.data, "Interpolated Regions", restoreID[1], startTime, endTime);
                }
            },
            failure: function(data) {
                console.log(data);
            }
        });
    });
    // Ajax post to backend for combining regions
    $('#combine-regions').click(function() {
        $.ajax({
            type: "POST",
            url: "/api/combine_regions",
            success: function(data) {
                if (data.success) {
                    var newID = generateNewPolygon(data.data, null);
                    deleteSelectedPolygons();
                }
            },
            failure: function(data) {
                console.log(data);
            }
        });
    });
    // Delete all the regions
    $("#clear-regions").on("click", function(e) {
        polygons.clearAll();
        $("#region-list").empty();
        showEmptyRegionList();
        $("#clear-regions").addClass("hidden");
        $("#combine-regions").addClass("hidden");
    });
    // Import regions from a geojson file
    $("#import-regions").on("change", function(e) {
        var files = e.target.files;
        if (files.length) {
            for (var i = 0, file; file = files[i]; i++) {
                var r = new FileReader();
                r.onload = function (evt) {
                    var contents = evt.target.result;
                    var jsonContents = JSON.parse(contents);
                    var features = map.data.addGeoJson(jsonContents);
                    map.data.forEach(function(feature){
                        var shapeArray = [];
                        var geometry = feature.getGeometry();
                        var type = geometry.getType();
                        if (type === "MultiPolygon") {
                            var polyList = geometry.getArray();
                            var latLongArrayList = [];
                            for (var list in polyList) {
                                var arrList = polyList[list].getArray();
                                for (var arr in arrList) {
                                    latLongArrayList.push(arrList[arr]);
                                }
                            }
                            var counter = 0;
                            var array = [];
                            latLongArrayList.forEach(function(latLongArray){
                                counter++;
                                var cycleArray = [];
                                latLongArray.forEachLatLng(function(latLong){
                                    var latLongDict = {};
                                    latLongDict.lat = latLong.lat();
                                    latLongDict.lng = latLong.lng();
                                    cycleArray.push(latLongDict)
                                });
                                if (counter % 2 === 0) {
                                    cycleArray = cycleArray.reverse()
                                }
                                array.push(cycleArray);
                            });
                            shapeArray.push(array);
                            for (var shape in shapeArray) {
                                generateNewPolygon(shapeArray[shape], null);
                            }
                        } else {
                            var latLongArrayList = geometry.getArray();
                            var counter = 0;
                            latLongArrayList.forEach(function(latLongArray){
                                counter++;
                                var cycleArray = [];
                                latLongArray.forEachLatLng(function(latLong){
                                    var latLongDict = {};
                                    latLongDict.lat = latLong.lat();
                                    latLongDict.lng = latLong.lng();
                                    cycleArray.push(latLongDict)
                                });
                                if (counter % 2 === 0) {
                                    cycleArray = cycleArray.reverse()
                                }
                                shapeArray.push(cycleArray)
                            });
                            generateNewPolygon(shapeArray, null)
                        }
                    });
                    for (var j = 0; j < features.length; j++)
                        map.data.remove(features[j]);
                };
                r.readAsText(file);
            }
            // Code to execute after that
            this.value = null;
            return false;
        } else {
            this.value = null;
            return false;
        }
    });
    // Show the interpolate inputs
    $("#interpolate-regions-open").click( function(e) {
        $('#start-time').removeClass("hidden");
        $('#interpolate-inputs-2').removeClass("hidden");
        $('#end-time').removeClass("hidden");
        $('#interpolate-inputs-3').removeClass("hidden");
    });
}

/*
 *    Generic function to handle all polygon actions. Add, delete, and select.
 *    After getting the function, it posts it to the backend.
 */
function managePolygon(polygonID, action, computation) {
    var paths = new Array();
    // Add function
    if (action === "add") {
        for (var singlePath in polygons.collection[polygonID].path.getArray()) {
            paths.push(polygons.collection[polygonID].path.getArray()[singlePath].getArray());
        }
        data = JSON.stringify(
            {
                "id": polygonID,
                "path": paths,
                "computation": computation,
                "action": action
            }
        );
        addPolygonToList(polygonID, computation);
    }
    // Delete function
    else if (action === "delete") {
        // If it's an IPPoly, remove it from that list.
        if(polygons.IPPolys[polygonID]) { delete polygons.IPPolys[polygonID]; }
        // If there isn't more than one IPPoly, hide the playAll functions
        if(Object.keys(polygons.IPPolys).length < 2) {
            $("#play-all-IPs").addClass("hidden");
            $("#stop-all-IPs").addClass("hidden");
            $("#play-all-speed").addClass("hidden");
            unbindPlayAllFunctions();
        }
        data = JSON.stringify(
            {
               "id": polygonID,
               "action": action
            }
        );
    }
    // Select function
    else if (action === "select") {
        data = JSON.stringify(
            {
               "id": polygonID,
               "action": action
            }
        );
    }
    // This should never happen.
    else {
        data = JSON.stringify(
            {
                "id": polygonID,
                "action": action
            }
        );
    }
    // Post the function and data
    $.ajax({
        type: "POST",
        url: "/api/manage_region",
        data: {"data": data},
        success: function(data) {
            // Nothing needs to be done client side
        },
        failure: function(data) {
            console.log(data);
        }
    });
    return polygonID;
}

/*
 *    Removes the empty list placeholder.
 *    Creates the card item for the region list tab. If the region is a 3D
 *    region then it will have a slider and play buttons and utilities. Binds all
 *    the play functions to the play buttons.
 *    Binds click events to the buttons found on the card item.
 */
function addPolygonToList(polygonID, computation) {
    var fillColor = polygons.collection[polygonID].fillColor;
    var compName = "";
    if (computation) {
        compName = " (" + computation + ")";
    }
    $("#placeholder-empty").remove();
    if(polygons.collection[polygonID].is3DPolygon === true) {
        var polygon = polygons.collection[polygonID];
        $("#region-list").append(
            $("<li>").attr("id", polygonID).attr("class", "list-group-item row")
                .attr("style", "margin: 1%; background-color: " + fillColor + ";")
                .append($("<h4>").attr("style", "padding-bottom: 5%;").text("Region ID: " + polygonID + compName))
                .append($("<input style='position: absolute; top: 0; right: 1%;' type='checkbox' disabled='disabled'>").attr("id", "checkbox-" + polygonID))
                .append($("<div>").attr("class", "controls-div")
                    .append($("<div>").attr("class", "").attr("style", "float: left; width: 50%;")
                        .append($("<input>").attr("type", "checkbox").attr("id", "slider-" + polygonID + "-checkbox").attr("class", "ignore-click").prop('checked', true))
                        .append($("<label>").attr("for", "slider-" + polygonID + "-checkbox").attr("class", "ignore-click").text(" Only create one region "))
                        .append($("<input>").attr("type", "checkbox").attr("id", "slider-" + polygonID + "-loop").attr("class", "ignore-click").prop('checked', false))
                        .append($("<label>").attr("for", "slider-" + polygonID + "-loop").attr("class", "ignore-click").text(" Loop "))
                    )
                    .append($("<div>").attr("class", "").attr("style", "float: right; width: 50%;")
                        .append($("<button>").attr("id", "slider-" + polygonID + "-stop")
                                             .attr("class", "btn glyphicon glyphicon-stop ignore-click")
                                             .attr("style", "float: right; display: inline; margin: 0.5%; width: 15%;"))
                        .append($("<button>").attr("id", "slider-" + polygonID + "-pause")
                                             .attr("class", "btn glyphicon glyphicon-pause ignore-click")
                                             .attr("style", "float: right; display: inline; margin: 0.5%; width: 15%;"))
                        .append($("<button>").attr("id", "slider-" + polygonID + "-play")
                                             .attr("class", "btn glyphicon glyphicon-play ignore-click")
                                             .attr("style", "float: right; display: inline; margin: 0.5%; width: 15%;"))
                        .append($("<input>").attr("id","slider-" + polygonID + "-speed")
                                            .attr("class", "form-control ignore-click")
                                            .attr("type", "number").attr("placeholder", "Speed")
                                            .attr("step","0.25").attr("min", "0.25").attr("max", "4")
                                            .attr("style", "float: right; display: inline; margin: 0.5%; width: 40%; text-align: center;"))
                    )
                )
                .append($("<input>").attr("type", "range").attr("id", "slider-" + polygonID).attr("class", "form-control ignore-click").attr("min", polygon.startTime).attr("max", polygon.endTime).attr("value", polygon.startTime).attr("style", "margin-bottom: 1%;"))
                .append($("<button>").attr("id", "show-hide-" + polygonID).attr("class", "btn btn-default col-md-5 mobile-device ignore-click").attr("style", "padding-bottom: 1%;").text("Hide"))
                .append($("<div>").attr("class", "col-md-2"))
                .append($("<button>").attr("id", "delete-" + polygonID).attr("class", "btn btn-danger col-md-5 mobile-device ignore-click").text("Delete"))
        );
        bindInterpolatedChange(polygonID, true);
        bindPlayFunctions(polygonID);
        $("#slider-" + polygonID + "-checkbox").click(function() {
            bindInterpolatedChange(polygonID, $(this).is(':checked'));
        });
        polygons.IPPolys[polygonID] = polygonID;
        if(Object.keys(polygons.IPPolys).length >= 2) {
            $("#play-all-IPs").removeClass("hidden");
            $("#stop-all-IPs").removeClass("hidden");
            $("#play-all-speed").removeClass("hidden");
            bindPlayAllFunctions();
        }
    } else {
        $("#region-list").append(
            $("<li>").attr("id", polygonID).attr("class", "list-group-item row")
                .attr("style", "margin: 1%; background-color: " + fillColor + ";")
                .append($("<h4>").attr("style", "padding-bottom: 5%;").text("ID: " + polygonID + compName))
                .append($("<input style='position: absolute; top: 0; right: 1%;' type='checkbox' disabled='disabled'>").attr("id", "checkbox-" + polygonID))
                .append($("<button>").attr("id", "show-hide-" + polygonID).attr("class", "btn btn-default col-md-5 mobile-device ignore-click").attr("style", "padding-bottom: 1%").text("Hide"))
                .append($("<div>").attr("class", "col-md-2"))
                .append($("<button>").attr("id", "delete-" + polygonID).attr("class", "btn btn-danger col-md-5 mobile-device ignore-click").text("Delete"))
        );
    }
    $("#show-hide-" + polygonID).on("click", function(e) {
        var polygon = polygons.collection[polygonID];
        showHidePolygonButton(this, polygon);
    });
    $("#delete-" + polygonID).on("click", function(e) {
        var polygonID = $(this).parent().attr("id");
        var polygon = polygons.collection[polygonID];
        deletePolygonButton(this, polygon);
    });
    $("#clear-regions").removeClass("hidden");
    $("#combine-regions").removeClass("hidden");
    $("#" + polygonID).on("click", function(e) {
        if (!$(e.target).hasClass("ignore-click"))
            handlePolygonSelect(polygonID);
   })
}

/*
 *    Unbind the play all functions from the play all buttons so they cannot be
 *    manipulated outside of being shown.
 */
function unbindPlayAllFunctions() {
    var playAll = $("#play-all-IPs").unbind();
    var stopAll = $("#stop-all-IPs").unbind();
}

/*
 *    Bind all of the play all functions to their respective buttons. Also
 *    determine the real play speed should it have been manipulated before
 *    the click event is fired.
 */
function bindPlayAllFunctions() {
    // HTML elements
    var playAll = $("#play-all-IPs").unbind();
    var stopAll = $("#stop-all-IPs").unbind();
    var playAllSpeed = $("#play-all-speed").unbind();

    var speed = 2; // Default speed.

    // Play all of the IPPolys
    playAll.on("click", function() {
        speed = playAllSpeed.val();
        // Set playallSpeed if it has been changed
        if(speed < 0.25 && speed > 0) { playallSpeed = 0.25; }
        else if(speed > 4) { playallSpeed = 4; }
        else if(speed == 0) { playallSpeed = 0; }
        else { playallSpeed = speed; }
        playallSpeed = checkSpeed(speed)
        for(var i in polygons.IPPolys) {
            $("#slider-" + i + "-play").click();
        }
    });

    // Stop and reset all of the IPPolys
    stopAll.on("click", function() {
      for(var i in polygons.IPPolys) {
          $("#slider-" + i + "-stop").click();
      }
    });
}

/*
 *    Bind the play/pause/stop functions to the HTML Buttons on the polygon card.
 *    Uses part of bindInterpolatedChange(...) to "animate" the regions as they
 *    are drawn between the two parent regions. Loops at a speed interval that is
 *    set and rectified to be within a preferred range. Can be paused and resumed
 *    as neeeded as well as stopped entirely (which also resets the slider). Works
 *    with the "create only one region" checkbox.
 */
function bindPlayFunctions(polygonID) {
    // HTML Elements
    var slider = $("#slider-" + polygonID);
    var play = $("#slider-" + polygonID + "-play").unbind();
    var pause = $("#slider-" + polygonID + "-pause").unbind();
    var stop = $("#slider-" + polygonID + "-stop").unbind();
    var checkbox = $("#slider-" + polygonID + "-checkbox");
    var playSpeed = $("#slider-" + polygonID + "-speed");
    var loopCheckbox = $("#slider-" + polygonID + "-loop");

    // Local variables
    var step = 1
    var minTime = Number(slider.attr("min"));
    var maxTime = Number(slider.attr("max"));
    var currTime = 0;
    var stopFlag = false;
    var pauseFlag = false;
    var loopFlag = true;
    var speed = 2;

    // Play function bound to the play button
    play.on("click", function() {
        currTime = Number(slider.val());
        stopFlag = false;
        pauseFlag = false;
        loopFlag = loopCheckbox.is(":checked");
        speed = Number(playSpeed.val());
        if(speed < 0.25 && speed > 0) { speed = 0.25; }
        else if(speed > 4) { speed = 4; }
        else if(speed == 0 && playallSpeed == 0) { speed = 2; }
        else if(playallSpeed > 0) { speed = playallSpeed; } // If playallSpeed is set, then use it
        var play = setInterval(function() {
            if( (currTime >= maxTime+1 && !loopFlag) || stopFlag === true) {
                clearInterval(play);
                currTime = minTime;
                slider.prop("value", currTime);
                return;
            }
            else if(pauseFlag === true) {
                clearInterval(play);
                return;
            }
            else if(currTime >= maxTime+1 && loopFlag) {
                currTime = minTime;
                slider.prop("value", currTime);
            }
            if (checkbox.is(":checked")) {
                data = JSON.stringify(
                    {
                        "time" : currTime,
                        "polygonID" : polygonID
                    }
                );
                var polygon = polygons.collection[polygonID];
                if (polygon.interpolatedRegionID !== 0) {
                    var button = "#delete-" + polygon.interpolatedRegionID;
                    $(button).parent().remove();
                    if (!$("#region-list").children().length) {
                        showEmptyRegionList();
                        $("#clear-regions").addClass("hidden");
                    }
                    $("#custom-menu").addClass("hidden");
                    polygons.delete(polygons.collection[polygon.interpolatedRegionID]);
                }
                $.ajax({
                    type: "POST",
                    url: "/api/find_region_at_time",
                    polyID: polygonID,
                    data: {"data": data},
                    success: function(data) {
                        var id = generateNewPolygon(data.data, "From Interoplated");
                        managePolygon(polygons.collection[this.polyID].interpolatedRegionID, "delete", null);
                        polygons.collection[this.polyID].interpolatedRegionID = id;
                    },
                    failure: function(data) {
                        console.log(data);
                    }
                });
            } else {
                data = JSON.stringify(
                    {
                        "time" : currTime,
                        "polygonID" : polygonID
                    }
                );
                $.ajax({
                    type: "POST",
                    url: "/api/find_region_at_time",
                    data: {"data": data},
                    success: function(data) {
                        generateNewPolygon(data.data, "From Interoplated")
                    },
                    failure: function(data) {
                        console.log(data);
                    }
                });
            }
            // console.log(currTime);
            slider.prop("value", currTime);
            currTime += 1;
        }, 1000/speed);
    });

    // Pause function bound to the pause button
    pause.on("click", function() {
        pauseFlag = true;
    });

    // Stop function bound to the stop button
    stop.on("click", function() {
        stopFlag = true;
    });
}

/*
 *    Binds functions to the slider for interpolated regions for on change or on
 *    input given the checkbox is checked to create only one region or all regions.
 *    If the checkbox is checked, it creates only one region at a time and removes
 *    the previous region. Otherwise, it create all the regions between the two
 *    parent regions.
 */
function bindInterpolatedChange(polygonID, checked) {
    $("#slider-" + polygonID).unbind();
    if (checked) {
        $("#slider-" + polygonID).on("input", function(e) {
            data = JSON.stringify(
                {
                    "time" : e.target.value,
                    "polygonID" : polygonID
                }
            );
            var polygon = polygons.collection[polygonID];
            if (polygon.interpolatedRegionID !== 0) {
                var button = "#delete-" + polygon.interpolatedRegionID;
                $(button).parent().remove();
                if (!$("#region-list").children().length) {
                    showEmptyRegionList();
                    $("#clear-regions").addClass("hidden");
                }
                $("#custom-menu").addClass("hidden");
                polygons.delete(polygons.collection[polygon.interpolatedRegionID]);
            }
            $.ajax({
                type: "POST",
                url: "/api/find_region_at_time",
                polyID: polygonID,
                data: {"data": data},
                success: function(data) {
                    var id = generateNewPolygon(data.data, "From Interoplated");
                    managePolygon(polygons.collection[this.polyID].interpolatedRegionID, "delete", null);
                    polygons.collection[this.polyID].interpolatedRegionID = id;
                },
                failure: function(data) {
                    console.log(data);
                }
            });
        });
    } else {
        $("#slider-" + polygonID).unbind().on("input", function(e) {
            data = JSON.stringify(
                {
                    "time" : e.target.value,
                    "polygonID" : polygonID
                }
            );
            console.log(e.target.value);
            $.ajax({
                type: "POST",
                url: "/api/find_region_at_time",
                data: {"data": data},
                success: function(data) {
                    generateNewPolygon(data.data, "From Interoplated")
                },
                failure: function(data) {
                    console.log(data);
                }
            });
        });
    }
}

/*
 *    Function used to handle whether the polygon should be selected or unselected
 *    based on existing parameters.
 */
function handlePolygonSelect(polygonID) {
    if (polygons.collection[polygonID].visible) {
        polygons.collection[polygonID].selected = !polygons.collection[polygonID].selected;
        var checkbox = $('#checkbox-'+polygonID);
        if (polygons.collection[polygonID].selected) {
            showPolygonSelectBorder(polygonID);
            polygons.collection[polygonID].setOptions({strokeWeight: 5});
            checkbox.prop("checked", true)
        } else {
            clearPolygonSelectBorder(polygonID);
            polygons.collection[polygonID].setOptions({strokeWeight: 3});
            checkbox.prop("checked", false)
        }
        managePolygon(polygonID, "select", null);
    }
}

/*
 *    Unselects all selected polygons with the help of a handler function
 *    handlePolygonSelect.
 */
function clearPolygonSelection() {
    for (polygonID in polygons.collection) {
        handlePolygonSelect(polygonID);
    }
}

/*
 *    One line function. Adds a thicker border around polygons showing that they
 *    are now selected.
 */
function showPolygonSelectBorder(polygonID) {
    $("#" + polygonID).css({"border": "2px solid black"});
}

/*
 *    One line function. Removes the thicker border from polygons showing that they
 *    are no longer selected.
 */
function clearPolygonSelectBorder(polygonID) {
    $("#" + polygonID).css({"border": "none"});
}

/*
 *    A function that is used to bind the delete functionality to an HTML element
 *    without needing anything other than the button and the polygon it is related
 *    to.
 */
function deletePolygonButton(button, polygon) {
    for (var polygonID in polygons.collection) {
        if (polygons.collection[polygonID].interpolatedRegionID === polygon.id) {
            polygons.collection[polygonID].interpolatedRegionID = 0;
        }
    }
    managePolygon(polygon.id, "delete");
    polygons.delete(polygon);
    $(button).parent().remove();
    if (!$("#region-list").children().length) {
        showEmptyRegionList();
        $("#clear-regions").addClass("hidden");
        $("#combine-regions").addClass("hidden");
    }
}

/*
 *    Hide or show the polygon based on the text in the button. Effectively an
 *    on/off switch to show/hide the polygon.
 */
function showHidePolygonButton(button, polygon) {
    if ($(button).text() === "Hide") {
        $(button).text("Show");
        polygons.hide(polygon);
    } else {
        $(button).text("Hide");
        polygons.show(polygon);
    }
    managePolygon(polygon.id, "visible");
}

/*
 *    Attempt to restore the polygons from the previous session given a refresh
 *    or accidental browser navigation occured. Does not work perfectly every time
 *    occasionally restoring polygons from sessions older than the immediate
 *    previous session.
 */
function restoreSession() {
    $.ajax({
        type: "POST",
        url: "/api/restore_session",
        success: function(data) {
            if (data.success) {
                // Doing a for instead of a foreach because foreach was giving
                // the index instead of the object. No idea.
                for (i = 0; i < data.data.polygons.length; i++) {
                    generateNewPolygon(data.data.polygons[i].coords,
                                       data.data.polygons[i].computation,
                                       data.data.polygons[i].id,
                                       data.data.polygons[i].visible);
                }
            }
        },
        failure: function(data) {
            console.log(data);
        }
    });
}

/*
 *    Creates a polygon from the given coords. polygonCoords is an object with
 *    arrays. The arrays are paths to take. Think of this as sides of a shape.
 *    restoreID is used for restoring a polygon, if it is set, not 0, then the
 *    new polygon isn't new, it is already in the session and we know an ID to
 *    give it. This avoids duplicate regions in session.
 */
function generateNewPolygon(polygonCoords, computation, restoreID, startTime, endTime) {
    var poly;
    var allPolygons = new Array();
    for (var polygon in polygonCoords) {
        var arr = new Array();
        for (var i = 0; i < polygonCoords[polygon].length; i++) {
            arr.push(new google.maps.LatLng(polygonCoords[polygon][i].lat, polygonCoords[polygon][i].lng));
        }
        allPolygons.push(arr);
    }
    poly = new google.maps.Polygon({
        paths: allPolygons,
        strokeWeight: 3,
        fillColor: polygons.generateColor(),
        fillOpacity: 0.8,
        zIndex: 3
    });
    var polygonID = 0;
    if (restoreID) {
        var is3d = computation === "Interpolated Regions";
        polygonID = polygons.newPolygon(poly, restoreID, is3d, startTime, endTime);
        addPolygonToList(polygonID, computation);
    } else {
        polygonID = polygons.newPolygon(poly);
        managePolygon(polygonID, "add", computation);
    }
    return polygonID;
}

/*
 *    Default HTML element placed after removal of all regions or on initial load
 *    of the webpage.
 */
function showEmptyRegionList() {
    $("#region-list").append(
        $("<li>").attr("id", "placeholder-empty").attr("class", "list-group-item").text(
            "No regions created. Draw on the map to create regions or import from a database.")
    );
}

/*
 *    Hidden element management. Handles the interaction of the user and polygons.
 *    Able to hide/show and delete polygons.
 */
function handleContextMenu(event, polygon) {
    // Show contextmenu
    $("#custom-menu").finish().toggle(100).css({
        top: event.eb.pageY + "px",
        left: event.eb.pageX + "px"
    });
    $("#custom-menu").removeClass("hidden");
    // If the menu element is clicked
    $("#custom-menu div").unbind().click(function(e) {
        // This is the triggered action name
        switch($(this).attr("data-action")) {
            case "hide": {
                var button = "#show-hide-" + polygon.id;
                showHidePolygonButton(button, polygon);
                $("#custom-menu").addClass("hidden");
                break;
            }
            case "delete": {
                var button = "#delete-" + polygon.id;
                deletePolygonButton(button, polygon);
                $("#custom-menu").addClass("hidden");
                break;
            }
            case "close": {
                $("#custom-menu").addClass("hidden");
                break;
            }
        }
      });
}

/*
 *    Delete all of the selected polygons. Used for clearing the selected polygons
 *    in the front end after certain functions. Also removes all of the respective
 *    HTML elements as well.
 */
function deleteSelectedPolygons(){
    for (polygonID in polygons.collection) {
        if (polygons.collection[polygonID].visible) {
            if (polygons.collection[polygonID].selected) {
                polygons.collection[polygonID].interpolatedRegionID = 0;
                var button = "#delete-" + polygonID;
                $(button).parent().remove();
                polygons.delete(polygons.collection[polygonID]);
                managePolygon(polygonID, "delete");
            }
        }
    }
    $.ajax({
        type: "GET",
        url: "/"
    });
}

/*
 *    Remove all the polygons from the session data so that they aren't restored
 *    on the next refresh of the web page
 */
function clearSession() {
    $.ajax({
        type: "POST",
        url: "/api/clear_session",
        success: function(data) {
        },
        failure: function(data) {
            console.log(data);
        }
    });
}

/*
 *    Start of the webpage
 */
$(document).ready(function() {
    initialize();
    restoreSession();
    $(document).on("click", function(e) {
        var target = $(e.target);
        if (!$("#custom-menu").hasClass("hidden")) {
            if (!(target.is("h4") || target.is("#custom-menu")))
                $("#custom-menu").addClass("hidden");
        }
    });
});
