var geolocation_init;
var flag_route = 0, flag_routing = 0, flightPath_routing;
var routing_locate_now, count;

var start_loc, end_loc;
var listener_routing_start, listener_routing_end;
var placeSearch_start, placeSearch_end;
var autocomplete_start, autocomplete_end;
var marker_routing_end, marker_routing_start, marker_routing_now;

var directionsService;
function initialize_RoutingService() {
  directionsService = new google.maps.DirectionsService();

  var directionsDisplay;
  directionsDisplay = new google.maps.DirectionsRenderer();
  directionsDisplay.setMap(map);
}

function initAutocomplete() {
  // Create the autocomplete object, restricting the search to geographical
  // location types.
  autocomplete_end = new google.maps.places.Autocomplete(
      /** @type {!HTMLInputElement} */(document.getElementById('autocomplete_end')),
    { types: [] });
  autocomplete_start = new google.maps.places.Autocomplete(
      /** @type {!HTMLInputElement} */(document.getElementById('autocomplete_start')),
    { types: [] });
  // When the user selects an address from the dropdown, populate the address
  // fields in the form.
  autocomplete_end.addListener('place_changed', function () {
    placeSearch_end = autocomplete_end.getPlace();
  });
  autocomplete_start.addListener('place_changed', function () {
    placeSearch_start = autocomplete_start.getPlace();
  });
}

// Bias the autocomplete object to the user's geographical location,
// as supplied by the browser's 'navigator.geolocation' object.
function CirclesetBounds() {
  var circle = new google.maps.Circle({
    center: geolocation_init,
    radius: 500
  });
  autocomplete_end.setBounds(circle.getBounds());
  autocomplete_start.setBounds(circle.getBounds());
}

function getLocation(callback) {
  var geoOptions = {
    enableHighAccuracy: true
  }

  var geoSuccess = function (position) {
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;

    var CurrentPosition = { lat: lat, lng: lng };

    if (callback && typeof (callback) === "function")
      callback(CurrentPosition);
  };
  var geoError = function (error) {
    alert("Please open your GPS.");
    $('#autocomplete_start').attr("placeholder", "Choose starting point");
    console.log('Error occurred. Error code: ' + error.code);
    // error.code can be:
    //   0: unknown error
    //   1: permission denied
    //   2: position unavailable (error response from location provider)
    //   3: timed out
  };

  navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
}

function addMarker_routing(location) {
  console.log(location);
  map.setCenter(location);
  if (marker_routing_now != null) marker_routing_now.setMap(null);
  marker_routing_now = new google.maps.Marker({
    position: location,
    label: "現在位置",
    map: map,
  });

  start_loc = new google.maps.LatLng(location.lat, location.lng);
  routing_locate_now = start_loc;
}

function initialize_chart() {
  var chart = Highcharts.chart('highchart', {
    title: {
      text: ' '
    },
    xAxis: {
      type: 'datetime',
    },
    legend: {
      maxHeight: 50,
    }
  });
}

function initialize_map() {
  // Create a new StyledMapType object, passing it the array of styles,
  // as well as the name to be displayed on the map type control.
  var styledMap = new google.maps.StyledMapType(styles,
    { name: "Styled Map" });
  // Create a map object, and include the MapTypeId to add
  // to the map type control.
  var mapOptions = {
    disableDefaultUI: true,
    zoom: 11,
    zoomControl: true,
    scaleControl: true,
    scrollwheel: true,
    center: geolocation_init,
    gestureHandling: 'greedy',
    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
    }
  };
  map = new google.maps.Map(document.getElementById('Location-map'), mapOptions);
  //Associate the styled map with the MapTypeId and set it to display.
  map.mapTypes.set('map_style', styledMap);
  map.setMapTypeId('map_style');

  //map center change
  map.addListener('dragend', function () {
    console.log('dragend');
  });

  //zoom in, zoom out
  map.addListener('idle', function () {
    console.log('idle');
  });
}

function marker_routing_now_timeout() {
  setTimeout(function () {
    if (marker_routing_now != null) marker_routing_now.setMap(null);
  }, 10000);
}


function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
}

function toast(y) {
  // Get the snackbar DIV
  var x = document.getElementById("snackbar");

  // Add the "show" class to DIV
  x.className = "show";
  x.innerHTML = y;
  // After 3 seconds, remove the show class from DIV
  setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
}

function setRoutePoint() {
  if ($('#autocomplete_end').val()[0].localeCompare('(') != 0) {
    end_loc = $('#autocomplete_end').val();
    console.log(end_loc);
    if (marker_routing_end != null) marker_routing_end.setMap(null);
    marker_routing_end = new google.maps.Marker({
      position: placeSearch_end.geometry.location,
      label: "終點",
      map: map
    });
  }

  console.log($('#autocomplete_start').val()[0]);

  if ($('#autocomplete_start').val()[0] == undefined || $('#autocomplete_start').val()[0].localeCompare('(') != 0) {
    console.log("autocomplete_start in");
    if ($('#autocomplete_start').val().length == 0) {
      if (marker_routing_start != null) marker_routing_start.setMap(null);
      start_loc = routing_locate_now;
    }
    else {
      start_loc = $('#autocomplete_start').val();
      console.log(start_loc);
      if (marker_routing_now != null) marker_routing_now.setMap(null);
      if (marker_routing_start != null) marker_routing_start.setMap(null);
      marker_routing_start = new google.maps.Marker({
        position: placeSearch_start.geometry.location,
        label: "起點",
        map: map
      });
    }

  }
}

function calcRoute(count) {
  var DirectionsRequest = {
    origin: start_loc,
    destination: end_loc,
    optimizeWaypoints: true,
    provideRouteAlternatives: true,
    travelMode: selectedMode,
    waypoints: waypts[count]
  };

  directionsService.route(
    DirectionsRequest,
    function (response, status) {
      var ob_array = [];
      if (status == google.maps.DirectionsStatus.OK) {
        $.getJSON($SCRIPT_ROOT + '/secure/_take_obstacles', function (data) {
          if (data.result != "NoObstacle")
            ob_array = data.result.map(function (obj) { return { lat: obj.lat, lng: obj.lon }; });
          console.log("response.routes.length " + response.routes.length);
          for (var i = 0, len = response.routes.length; i < len; i++) {
            var ob_flag = 0;
            console.log("response.routes " + i);
            var path_bounds = response.routes[i].bounds;
            path_bounds = JSON.stringify(path_bounds);
            console.log(path_bounds);
            path_bounds = JSON.parse(path_bounds);
            var path = response.routes[i].overview_path;
            path = JSON.stringify(path);
            path = JSON.parse(path);

            var ob_array_in_area = [];
            for (var m = 0; m < ob_array.length; m++) {
              if (ob_array[m].lat > path_bounds.south - obstacle_area && ob_array[m].lat < path_bounds.north + obstacle_area)
                if (ob_array[m].lng > path_bounds.west - obstacle_area && ob_array[m].lng < path_bounds.east + obstacle_area)
                  ob_array_in_area.push(ob_array[m]);
            }

            console.log(JSON.stringify(ob_array_in_area));

            var path_array_in_order = [];
            for (var m = 0; m < path.length - 1; m++) {
              if (path[m].lat < path[m + 1].lat)
                path_array_in_order.push([path[m], path[m + 1]]);
              else
                path_array_in_order.push([path[m + 1], path[m]]);
            }

            for (var j = 0; j < path_array_in_order.length; j++) {

              for (var k = 0; k < ob_array_in_area.length; k++) {
                var dis = 10000000;
                if (ob_array_in_area[k].lat > (path_array_in_order[j][0].lat - obstacle_area) && ob_array_in_area[k].lat < (path_array_in_order[j][1].lat + obstacle_area)) {
                  var dis_flag = 0;
                  if (path_array_in_order[j][0].lng < path_array_in_order[j][1].lng) {
                    if (ob_array_in_area[k].lng > (path_array_in_order[j][0].lng - obstacle_area) && ob_array_in_area[k].lng < (path_array_in_order[j][1].lng + obstacle_area)) {
                      dis_flag = 1;
                    }
                  }
                  else {
                    if (ob_array_in_area[k].lng < (path_array_in_order[j][0].lng + obstacle_area) && ob_array_in_area[k].lng > (path_array_in_order[j][1].lng - obstacle_area)) {
                      dis_flag = 1;
                    }
                  }

                  if (dis_flag == 1) {
                    v = [(path_array_in_order[j][1].lat - path_array_in_order[j][0].lat), (path_array_in_order[j][1].lng - path_array_in_order[j][0].lng)];
                    v1 = [(ob_array_in_area[k].lat - path_array_in_order[j][0].lat), (ob_array_in_area[k].lng - path_array_in_order[j][0].lng)];
                    v2 = [(ob_array_in_area[k].lat - path_array_in_order[j][1].lat), (ob_array_in_area[k].lng - path_array_in_order[j][1].lng)];

                    if ((v[0] * v1[0] + v[1] * v1[1]) <= 0) {
                      dis = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
                      console.log("(v[0]*v1[0]+v[1]*v1[1]) <= 0");
                    }
                    else if ((v[0] * v2[0] + v[1] * v2[1]) >= 0) {
                      dis = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
                      console.log("(v[0]*v2[0]+v[1]*v2[1]) >= 0");
                    }
                    else {
                      if (path_array_in_order[j][1].lat == path_array_in_order[j][0].lat) {
                        dis = Math.abs(path_array_in_order[j][0].lat - ob_array_in_area[k].lat);
                      }
                      else {
                        var a = (path_array_in_order[j][1].lng - path_array_in_order[j][0].lng) / (path_array_in_order[j][1].lat - path_array_in_order[j][0].lat);
                        var b = path_array_in_order[j][0].lng - a * path_array_in_order[j][0].lat;
                        dis = Math.abs(a * ob_array_in_area[k].lat - ob_array_in_area[k].lng + b) / Math.sqrt(a * a + 1);
                        console.log("線段內");
                      }

                    }
                    console.log("ob_array_in_area:" + JSON.stringify(ob_array_in_area[k]) + " dis: " + dis);
                  }
                }
                ob_flag = 0;
                if (dis < ob_route_dis_std) {
                  console.log("in" + dis);
                  ob_flag = 1;
                  break;
                }
              }
              if (ob_flag == 1) {
                console.log("break");
                break;
              }
            }

            if (flightPath_routing != null) {
              flightPath_routing.setMap(null);
              flightPath_routing = null;
            }

            if (ob_flag == 0) {
              flightPath_routing = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#0044BB',
                strokeOpacity: 1.0,
                strokeWeight: 2,
              });

              flightPath_routing.setMap(map);
              google.maps.event.removeListener(listener_routing_end);
              google.maps.event.removeListener(listener_routing_start);
              $('#input_destination').hide();
              break;
            }
            else {
              if (i == (response.routes.length - 1)) {
                console.log("There is no road to destination. count=" + count + " waypts.length-1 " + (waypts.length - 1));
                if (count == (waypts.length - 1)) {
                  toast("There is no road to destination.");
                  console.log(flightPath_routing);
                  $('#input_destination').show();
                  marker_routing_end.setMap(null);
                  marker_routing_start.setMap(null);
                }
                count = count + 1;
                sleep(200);
                calcRoute(count);

              }
              ob_flag = 0;
            }
          }
        });

      } else {
        console.log("There is no road to destination. count=" + count + " waypts.length-1 " + (waypts.length - 1));
        toast("There is no road to destination.");
        console.log(flightPath_routing);
        $('#input_destination').show();
        marker_routing_end.setMap(null);
        marker_routing_start.setMap(null);
        $("#error").append("Unable to retrieve your route<br />");
      }
    }
  );

}
//---------------------------------------------------------------------------
//-------修改處--------------------------------------------------------------
//---------------------------------------------------------------------------
//---------------------------------------------------------------------------
function load_specific_app(spec_app_num) {
  var tmp_app_num;
  var spec_app;

  if (spec_app_num == 10) {
    spec_app = "Warning";
  } else if (spec_app_num == 11) {
    spec_app = "Rainy";
  }

  for (var i = 0; i < all_app_list.length; i++) {
    if (all_app_list[i].app == spec_app) {
      tmp_app_num = i;
      break;
    }
  }

  console.log("specnum:" + spec_app + "tmpnum:" + tmp_app_num);
//-------------------- ------------------------------------------------------
//下面類似
//---------------------------------------------------------------------------
  if (all_app_list.length > 0) {
    var show = 0;
    if (all_app_list[tmp_app_num].show == 1) {
      show = 1;
    }

    for (var i = 0; i < all_app_list.length; i++) {
      $(document).off("click", "#show_" + i);
      $(document).off("click", "#app_" + i);
      $("#" + i + "_list").remove();
      $("#" + i + "_quick_list").remove();
    }


    for (var i = 0; i < all_icon_list.length; i++) {
      $(document).off("click", "#icon_" + i);
      if(all_icon_list[i].real_app_num == spec_app_num) {
        all_icon_list[i].marker.setMap(null);
        google.maps.event.removeListener(all_icon_list[i].marker_listener);
      }
    }

    var tmp_app_list = all_app_list;
    var tmp_icon_list = all_icon_list;

    all_icon_list = [];
    all_app_list = [];
    all_static_icon_list = [];
    all_iottalk_data_list = [];
  }

  //number(0), app(1), kind(2) mobility(3), icon(4), picture(5), visual(6), color_min(7), color_max(8), quick_access(9)

  $.getJSON($SCRIPT_ROOT + "/secure/_take_all_app", function (data) {
    all_app_list = data.result.map(function (obj) {
      return {
        'number': obj.number,
        'app': obj.app,
        'kind': obj.kind,
        'mobility': obj.mobility,
        'icon': obj.icon,
        'picture': obj.picture,
        'visual': obj.visual,
        'color_min': obj.color_min,
        'color_max': obj.color_max,
        'quick_access': obj.quick_access
      };
    });
    $.getJSON($SCRIPT_ROOT + "/secure/_take_all_static_icon", function (data) {
      all_static_icon_list = data.result.map(function (obj) {
        return {
          'number': obj.number,
          'app_num': obj.app_num,
          'name': obj.name,
          'lat': obj.lat,
          'lng': obj.lng,
          'description': obj.description
        };
      });

      $.getJSON($SCRIPT_ROOT + "/secure/_take_all_iottalk_data", function (
        data
      ) {
        all_iottalk_data_list = data.result.map(function (obj) {
          return {
            'app_num': obj.app_num,
            'name': obj.name,
            'lat': obj.lat,
            'lng': obj.lng,
            'value': obj.value,
            'time': obj.time
          };
        });

        for (var i = 0; i < all_app_list.length; i++) {
          for (var j = 0; j < tmp_app_list.length; j++) {
            if (all_app_list[i].app == tmp_app_list[j].app) {
              all_app_list[i] = tmp_app_list[j];
            }
            if (all_app_list[i].app == spec_app) {
              tmp_app_num = i;
            }
          }
        }

        console.log("quick_access == 1: " + all_app_list[tmp_app_num].app);

        for (var i = 0; i < all_app_list.length; i++) {
          str = '<div class="collapse" style="min-width: 140px;" id="' + i + '_list"></div>';
          $('#' + i + '_menu').append(str);

          str = '<button type="button" style="border-color:white ;background-color:  #eee; min-width:100%; color:#337ab7" class="list-group-item history btn btn-outline-primary" id="show_' + i + '" value="' + i + '">Show All</button>';
          $('#' + i + '_list').append(str);

          str = '<ul class="dropdown-menu pre-scrollable" id="' + i + '_quick_list" style="min-width: 130px;"></ul>';
          $('#' + i + '_quick_menu').append(str);

          str = '<li style="cursor:pointer;min-width: 140px;" ><button  type="button" style="border-color:white ;background-color:#eee; min-width:100%; color:#337ab7" class="history btn btn-outline-primary" id="show_' + i + '" value="' + i + '">Show All</button></li>';
          $('#' + i + '_quick_list').append(str);
        }




        for (var i = 0; i < all_app_list.length; i++) {

          for (var j = 0; j < all_iottalk_data_list.length; j++) {
            if (all_iottalk_data_list[j].app_num == all_app_list[i].number) {
              for (var k = 0; k < all_static_icon_list.length; k++) {
                if (all_iottalk_data_list[j].app_num == all_static_icon_list[k].app_num && all_iottalk_data_list[j].name == all_static_icon_list[k].name && all_static_icon_list[k].real_app_num == undefined) {
                  all_icon_list.push(all_static_icon_list[k]);
                  all_static_icon_list[k].add = 1;
                  set_all_icon(all_icon_list.length - 1, all_iottalk_data_list[j].value, i, all_iottalk_data_list[j].time);
                  //Tracking
                  if (all_icon_list[all_icon_list.length - 1].name == window.person && all_icon_list[all_icon_list.length - 1].real_app_num == window.trackingAppNum) {
                    console.log("show_tracking_target");
                    show_tracking_target(all_icon_list.length - 1, all_icon_list[all_icon_list.length - 1].lat, all_icon_list[all_icon_list.length - 1].lng, map);
                  }
                  break;
                }
              }
            }
          }


          if (all_app_list[i].kind >= 1 && all_app_list[i].kind <= 4) {
            for (var j = 0; j < all_static_icon_list.length; j++) {
              if (all_static_icon_list[j].app_num == all_app_list[i].number && all_static_icon_list[j].add == undefined) {
                all_icon_list.push(all_static_icon_list[j]);
                all_static_icon_list[j].add = 1;
                set_all_icon(all_icon_list.length - 1, "", i);
              }
            }
          }


          if (all_app_list[i].app == spec_app) {
            $('[id="show_' + i + '"]').css("background-color", color_shape[i]);
            $('[id="show_' + i + '"]').css("color", "white");
            $('[id="show_' + i + '"]').html('Hide All');
            for (var j = 0; j < all_icon_list.length; j++) {
              if (all_app_list[all_icon_list[j].app_num].app == all_app_list[i].app) {
                all_app_list[i].show = 1;
                all_icon_list[j].show_count = all_icon_list[j].show_count + 1;
                all_icon_list[j].show = 1;
                $('[id="icon_' + j + '"]').css("background-color", color_shape[i]);
                $('[id="icon_' + j + '"]').css("color", "white");

                all_icon_list[j].marker.setVisible(true);
              }
            }
          }

          $(document).on('click', '#show_' + i, function () {
            app_num = $(this).val();
            $('#MainMenu').collapse('hide');
            $('#' + app_num + '_list').collapse('hide');
            console.log('app_num: ' + app_num);
            if (all_app_list[app_num].show == 0) {
              all_app_list[app_num].show = 1;
              if (all_app_list[app_num].app == "Camera" || all_app_list[app_num].app == "Obstacle") {
                $('[id="show_' + app_num + '"]').css("background-color", color_shape[app_num]);
                $('[id="show_' + app_num + '"]').css("color", "white");
                $('[id="show_' + app_num + '"]').html('Hide All');
                for (var j = 0; j < all_icon_list.length; j++) {
                  if (all_app_list[all_icon_list[j].app_num].app == all_app_list[app_num].app) {
                    if (all_icon_list[j].show == 0)
                      add_app_show_count();
                    all_icon_list[j].show = 1;
                    $('[id="icon_' + j + '"]').css("background-color", color_shape[app_num]);
                    $('[id="icon_' + j + '"]').css("color", "white");

                    all_icon_list[j].marker.setVisible(true);
                  }
                }
              }
              else {
                if (all_app_list[app_num].kind >= 1 && all_app_list[app_num].kind <= 4) {
                  $('[id="show_' + app_num + '"]').css("background-color", color_shape[app_num]);
                  $('[id="show_' + app_num + '"]').css("color", "white");
                  $('[id="show_' + app_num + '"]').html('Hide All');

                  for (var j = 0; j < all_icon_list.length; j++) {
                    if (all_icon_list[j].app_num == app_num) {
                      icon_num = j;
                      all_icon_list[icon_num].history = 0;
                      if (all_icon_list[j].show == 0)
                        add_app_show_count();
                      set_loc_history_time();
                    }
                  }
                }
                else //movable
                {
                  $('[id="show_' + app_num + '"]').css("background-color", color_shape[app_num]);
                  $('[id="show_' + app_num + '"]').css("color", "white");
                  $('[id="show_' + app_num + '"]').html('Hide All');

                  for (var j = 0; j < all_icon_list.length; j++) {
                    if (all_icon_list[j].app_num == app_num) {
                      icon_num = j;
                      all_icon_list[icon_num].history = 0;
                      if (all_icon_list[j].show == 0)
                        add_app_show_count();
                      set_loc_history_time();
                    }
                  }
                }

              }

            }
            else //all_app_list[app_num].show == 1
            {
              for (var j = 0; j < all_icon_list.length; j++) {
                if (all_icon_list[j].app_num == app_num) {
                  icon_num = j;
                  set_icon_on_null();
                }
              }
            }
          });
        }

        for (var i = 0; i < all_icon_list.length; i++) {
          for (var j = 0; j < tmp_icon_list.length; j++) {
            if (all_icon_list[i].name == tmp_icon_list[j].name && all_icon_list[i].real_app_num != spec_app_num) {
              all_icon_list[i] = tmp_icon_list[j];
              break;
            }
          }
          if (all_icon_list[i].show == 1) {
            $('[id="show_' + i + '"]').css("background-color", color_shape[i]);
            $('[id="show_' + i + '"]').css("color", "white");
          }
        }
        for (var i = 0; i < all_app_list.length; i++) {
          if (all_app_list[i].show == 1) {
            $('[id="show_' + i + '"]').css("background-color", color_shape[i]);
            $('[id="show_' + i + '"]').css("color", "white");
            $('[id="show_' + i + '"]').html('Hide All');
          }
        }

      });
  

    });


  });
}

function load_all_app() {
  if (all_app_list.length > 0) {
    for (var i = 0; i < all_app_list.length; i++) {
      $(document).off('click', '#show_' + i);
      $(document).off('click', '#app_' + i);
      $('#' + i + '_menu').remove();
      $('#' + i + '_quick_menu').remove();
    }
    for (var i = 0; i < all_icon_list.length; i++) {
      $(document).off('click', '#icon_' + i);
      all_icon_list[i].marker.setMap(null);
      google.maps.event.removeListener(all_icon_list[i].marker_listener);
    }
    all_icon_list = [];
    all_app_list = [];
    all_static_icon_list = [];
    all_iottalk_data_list = [];
  }
  //number(0), app(1), kind(2) mobility(3), icon(4), picture(5), visual(6), color_min(7), color_max(8), quick_access(9)
  $.getJSON($SCRIPT_ROOT + '/secure/_take_all_app', function (data) {
    all_app_list = data.result.map(function (obj) {
      return {
        'number': obj.number,
        'app': obj.app,
        'kind': obj.kind,
        'mobility': obj.mobility,
        'icon': obj.icon,
        'picture': obj.picture,
        'visual': obj.visual,
        'color_min': obj.color_min,
        'color_max': obj.color_max,
        'quick_access': obj.quick_access
      };
    });

    console.log(all_app_list);

    $.getJSON($SCRIPT_ROOT + '/secure/_take_all_static_icon', function (data) {
      all_static_icon_list = data.result.map(function (obj) {
        return {
          'number': obj.number,
          'app_num': obj.app_num,
          'name': obj.name,
          'lat': obj.lat,
          'lng': obj.lng,
          'description': obj.description
        };
      });

      $.getJSON($SCRIPT_ROOT + '/secure/_take_all_iottalk_data', function (data) {
        all_iottalk_data_list = data.result.map(function (obj) {
          return {
            'app_num': obj.app_num,
            'name': obj.name,
            'lat': obj.lat,
            'lng': obj.lng,
            'value': obj.value,
            'time': obj.time
          };
        });

        for (var i = 0; i < all_app_list.length; i++) {
          var app_name = all_app_list[i].app;
          str = '<div id="' + i + '_menu"><button type="button" style="cursor:default;background-color:#fff; min-width:138px; color:#555" class="list-group-item history btn btn-outline-primary" data-toggle="collapse" data-parent="#MainMenu" data-target="#' + i + '_list" id="app_' + i + '" value="' + i + '">' + app_name + ' &#9662;</button></div>';
          $('#app_list').append(str);

          quick_access_space = quick_access_space_check();
          if (all_app_list[i].quick_access == 1 && quick_access_space) {

            console.log('quick_access == 1: ' + all_app_list[i].app);
            str = '<li id="' + i + '_quick_menu" role="presentation" class="menu-item dropdown" class="active"> \
                    <button type="button" id="quick_app_'+ i + '" style="min-width:120px;height:40px;cursor:pointer;color:#fff;background:' + color_shape[i] + ';" class="dropdown-toggle history btn btn-outline-primary" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false" value="' + i + '">' + app_name + '<span class="caret"></span></button> \
                  </li>';
            $('#list').append(str);
            quick_access_count++;
          }

          str = '<div class="collapse" style="min-width: 140px;" id="' + i + '_list"></div>';
          $('#' + i + '_menu').append(str);

          str = '<button type="button" style="border-color:white ;background-color:  #eee; min-width:100%; color:#337ab7" class="list-group-item history btn btn-outline-primary" id="show_' + i + '" value="' + i + '">Show All</button>';
          $('#' + i + '_list').append(str);

          if (all_app_list[i].quick_access == 1 && quick_access_space) {
            str = '<ul class="dropdown-menu pre-scrollable" id="' + i + '_quick_list" style="min-width: 130px;"></ul>';
            $('#' + i + '_quick_menu').append(str);

            str = '<li style="cursor:pointer;min-width: 140px;" ><button  type="button" style="border-color:white ;background-color:#eee; min-width:100%; color:#337ab7" class="history btn btn-outline-primary" id="show_' + i + '" value="' + i + '">Show All</button></li>';
            $('#' + i + '_quick_list').append(str);
          }

          all_app_list[i].show = 0;
          all_app_list[i].count = 0;//此app底下有幾個icon
          all_app_list[i].show_count = 0;

          for (var j = 0; j < all_iottalk_data_list.length; j++) {
            if (all_iottalk_data_list[j].app_num == all_app_list[i].number) {
              for (var k = 0; k < all_static_icon_list.length; k++) {
                if (all_iottalk_data_list[j].app_num == all_static_icon_list[k].app_num && all_iottalk_data_list[j].name == all_static_icon_list[k].name && all_static_icon_list[k].real_app_num == undefined) {
                  all_icon_list.push(all_static_icon_list[k]);
                  all_static_icon_list[k].add = 1;
                  set_all_icon(all_icon_list.length - 1, all_iottalk_data_list[j].value, i, all_iottalk_data_list[j].time);
                  //Tracking
                  if (all_icon_list[all_icon_list.length - 1].name == window.person && all_icon_list[all_icon_list.length - 1].real_app_num == window.trackingAppNum) {
                    console.log("show_tracking_target");
                    show_tracking_target(all_icon_list.length - 1, all_icon_list[all_icon_list.length - 1].lat, all_icon_list[all_icon_list.length - 1].lng, map);
                  }
                  break;
                }
              }
            }
          }


          if (all_app_list[i].kind >= 1 && all_app_list[i].kind <= 4) {
            for (var j = 0; j < all_static_icon_list.length; j++) {
              if (all_static_icon_list[j].app_num == all_app_list[i].number && all_static_icon_list[j].add == undefined) {
                all_icon_list.push(all_static_icon_list[j]);
                all_static_icon_list[j].add = 1;
                set_all_icon(all_icon_list.length - 1, "", i);
              }
            }
          }
//--------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------
//修改處
//--------------------------------------------------------------------------------------------
          if (app_name == "Warning" || app_name == "Rainy") {
            $('[id="show_' + i + '"]').css("background-color", color_shape[i]);
            $('[id="show_' + i + '"]').css("color", "white");
            $('[id="show_' + i + '"]').html('Hide All');
            for (var j = 0; j < all_icon_list.length; j++) {
              if (all_app_list[all_icon_list[j].app_num].app == all_app_list[i].app) {
                all_app_list[i].show = 1;
                all_icon_list[j].show_count = all_icon_list[j].show_count + 1;
                all_icon_list[j].show = 1;
                $('[id="icon_' + j + '"]').css("background-color", color_shape[i]);
                $('[id="icon_' + j + '"]').css("color", "white");

                all_icon_list[j].marker.setVisible(true);
              }
            }
          }

          $(document).on('click', '#show_' + i, function () {
            app_num = $(this).val();
            $('#MainMenu').collapse('hide');
            $('#' + app_num + '_list').collapse('hide');
            console.log('app_num: ' + app_num);
            if (all_app_list[app_num].show == 0) {
              all_app_list[app_num].show = 1;
              if (all_app_list[app_num].app == "Camera" || all_app_list[app_num].app == "Obstacle") {
                $('[id="show_' + app_num + '"]').css("background-color", color_shape[app_num]);
                $('[id="show_' + app_num + '"]').css("color", "white");
                $('[id="show_' + app_num + '"]').html('Hide All');
                for (var j = 0; j < all_icon_list.length; j++) {
                  if (all_app_list[all_icon_list[j].app_num].app == all_app_list[app_num].app) {
                    if (all_icon_list[j].show == 0)
                      add_app_show_count();
                    all_icon_list[j].show = 1;
                    $('[id="icon_' + j + '"]').css("background-color", color_shape[app_num]);
                    $('[id="icon_' + j + '"]').css("color", "white");

                    all_icon_list[j].marker.setVisible(true);
                  }
                }
              }
              else {
                if (all_app_list[app_num].kind >= 1 && all_app_list[app_num].kind <= 4) {
                  $('[id="show_' + app_num + '"]').css("background-color", color_shape[app_num]);
                  $('[id="show_' + app_num + '"]').css("color", "white");
                  $('[id="show_' + app_num + '"]').html('Hide All');

                  for (var j = 0; j < all_icon_list.length; j++) {
                    if (all_icon_list[j].app_num == app_num) {
                      icon_num = j;
                      all_icon_list[icon_num].history = 0;
                      if (all_icon_list[j].show == 0)
                        add_app_show_count();
                      set_loc_history_time();
                    }
                  }
                }
                else //movable
                {
                  $('[id="show_' + app_num + '"]').css("background-color", color_shape[app_num]);
                  $('[id="show_' + app_num + '"]').css("color", "white");
                  $('[id="show_' + app_num + '"]').html('Hide All');

                  for (var j = 0; j < all_icon_list.length; j++) {
                    if (all_icon_list[j].app_num == app_num) {
                      icon_num = j;
                      all_icon_list[icon_num].history = 0;
                      if (all_icon_list[j].show == 0)
                        add_app_show_count();
                      set_loc_history_time();
                    }
                  }
                }

              }

            }
            else //all_app_list[app_num].show == 1
            {
              for (var j = 0; j < all_icon_list.length; j++) {
                if (all_icon_list[j].app_num == app_num) {
                  icon_num = j;
                  set_icon_on_null();
                }
              }
            }
          });

        }

      });


    });


  });
}

function quick_access_space_check() {
  if ($(window).width() > mobile_width)
    return 1;
  else if ($(window).width() <= mobile_width && quick_access_count < 2)
    return 1;
  else
    return 0;
}

function set_all_icon(num, value, app, time = "no") {
  all_icon_list[num].count = all_app_list[app].count;//自己的app底下第幾個
  all_app_list[app].count = all_app_list[app].count + 1;
  all_icon_list[num].real_app_num = all_icon_list[num].app_num;
  all_icon_list[num].app_num = app;
  all_icon_list[num].show = 0;
  all_icon_list[num].history = 0;

  console.log(all_icon_list[num].name);
  var marker = icon_style(app, all_icon_list[num].lat, all_icon_list[num].lng, value, time);
  var marker_listener = icon_listener(num, marker, time);
  all_icon_list[num].marker = marker;
  all_icon_list[num].marker_listener = marker_listener[0];
  all_icon_list[num].info = marker_listener[1];

  var icon_name = all_icon_list[num].name;
  if (all_app_list[app].kind >= 5 && all_app_list[app].kind <= 8)
    icon_name = value + ":" + all_icon_list[num].name;

  str = '<button type="button" style="border-color:white ;background-color:  #eee; min-width:100%; color:#337ab7" class="list-group-item history btn btn-outline-primary" id="icon_' + num + '" value="' + num + '">' + icon_name + '</button>';
  $('#' + app + '_list').append(str);

  if (all_app_list[app].quick_access == 1 && quick_access_space) {
    str = '<li style="cursor:pointer;min-width: 140px;" ><button  type="button" style="border-color:white ;background-color:#eee; min-width:100%; color:#337ab7" class="history btn btn-outline-primary" id="icon_' + num + '" value="' + num + '">' + icon_name + '</button></li>';
    $('#' + app + '_quick_list').append(str);
  }

  $(document).on('click', '#icon_' + num, function () {
    icon_num = $(this).val();
    app_num = all_icon_list[icon_num].app_num;
    $('#MainMenu').collapse('hide');
    $('#' + app_num + '_list').collapse('hide');
    console.log('all_icon_list[icon_num].show: ' + all_icon_list[icon_num].show);
    if (all_icon_list[icon_num].show == 0) {
      if (all_app_list[app_num].app == "Camera") {
        add_app_show_count();
        all_icon_list[icon_num].show = 1;
        $('[id="icon_' + icon_num + '"]').css("background-color", color_shape[app_num]);
        $('[id="icon_' + icon_num + '"]').css("color", "white");

        resetCenter(all_icon_list[icon_num].marker);

        cam_src = all_icon_list[icon_num].description;
        $('#Video-Display').attr('src', $('#Video-Display').attr('src'));
        $('#Video-Display').show();
        $('#fuck_off').show();

        all_icon_list[icon_num].marker.setVisible(true);
      }
      else if (all_app_list[app_num].app == "Obstacle") {
        add_app_show_count();
        all_icon_list[icon_num].show = 1;
        $('[id="icon_' + icon_num + '"]').css("background-color", color_shape[app_num]);
        $('[id="icon_' + icon_num + '"]').css("color", "white");

        resetCenter(all_icon_list[icon_num].marker);
        all_icon_list[icon_num].marker.setVisible(true);
      }
      else {
        if (all_app_list[app_num].kind >= 1 && all_app_list[app_num].kind <= 4) {
          all_icon_list[icon_num].history = optradio;
          map.setCenter({ lat: all_icon_list[icon_num].lat, lng: all_icon_list[icon_num].lng });
          map.setZoom(16);
          add_app_show_count();
          set_loc_history_time();
        }
        else //movable
        {
          all_icon_list[icon_num].history = 0;
          map.setCenter({ lat: all_icon_list[icon_num].lat, lng: all_icon_list[icon_num].lng });
          map.setZoom(16);
          add_app_show_count();
          set_loc_history_time();
        }
      }
    }
    else //all_icon_list[icon_num].show == 1
    {
      set_icon_on_null();
    }

  });
}

function create_color_scale(app, min, max, title) {
  console.log(app);
  console.log(min);
  console.log(max);
  $("#color_scale").append('<svg id="color_scale_' + app + '"></svg><br>');
  d3.select("#color_scale_" + app).append("text")
    .attr('x', 0)
    .attr('y', 20)
    .style('fill', 'black')
    .style('font-size', '15px')
    .style('font-weight', 'bold')
    .text(title);

  //Draw the legend rectangle and fill with color
  for (var i = 0; i < color_range.length; i++) {
    d3.select("#color_scale_" + app).append("rect")
      .attr("width", 40)
      .attr("height", 20)
      .attr("x", i * 40 + 2 + 100)
      .attr("y", 0)
      .style("fill", color_range[i]);
  }

  //create tick marks
  var x = d3.scaleLinear()
    .domain([min, max])
    .range([0, 200]);

  var axis = d3.axisBottom(x).tickValues(d3.range(min, max + (max - min) * 0.2, (max - min) * 0.2));

  d3.select("#color_scale_" + app)
    .attr("class", "axis")
    .attr("width", 335)
    .attr("height", 50)
    .append("g")
    .attr("id", "g-runoff")
    .attr("transform", "translate(102,20)")
    .style('font-size', '15px')
    .call(axis);
}

function add_app_show_count() {
  if (all_app_list[app_num].show_count == 0) {
    $('[id="app_' + app_num + '"]').css("background-color", color_shape[app_num]);
    $('[id="app_' + app_num + '"]').css("color", "white");
  }

  if ((all_app_list[app_num].kind == 4 || all_app_list[app_num].kind == 8) && all_app_list[app_num].show_count == 0) {
    create_color_scale(app_num, all_app_list[app_num].color_min, all_app_list[app_num].color_max, all_app_list[app_num].app);
  }

  all_app_list[app_num].show_count = all_app_list[app_num].show_count + 1;
  console.log("add_app_show_count: " + all_app_list[app_num].show_count);
}

function decrease_app_show_count() {

  all_app_list[app_num].show_count = all_app_list[app_num].show_count - 1;
  console.log("decrease_app_show_count: " + all_app_list[app_num].show_count);
  if (all_app_list[app_num].show_count == 0) {
    $('[id="app_' + app_num + '"]').css("background-color", "#fff");
    $('[id="app_' + app_num + '"]').css("color", "#555");
    $("#color_scale_" + app_num).remove();
  }
}

function set_icon_on_null() {
  decrease_app_show_count();

  if (all_app_list[app_num].show > 0) {
    all_app_list[app_num].show = 0;
    $('[id="show_' + app_num + '"]').css("background-color", "#eee");
    $('[id="show_' + app_num + '"]').css("color", "#337ab7");
    $('[id="show_' + app_num + '"]').html('Show All');
  }
  all_icon_list[icon_num].show = 0;
  $('[id="icon_' + icon_num + '"]').css("background-color", "#eee");
  $('[id="icon_' + icon_num + '"]').css("color", "#337ab7");
  all_icon_list[icon_num].info.close();
  all_icon_list[icon_num].marker.setVisible(false);
  if (all_icon_list[icon_num].history_marker != undefined) {
    all_icon_list[icon_num].history_marker.setMap(null);
    google.maps.event.removeListener(all_icon_list[icon_num].history_marker_listener);
  }
  if (all_icon_list[icon_num].history_path != undefined) {
    all_icon_list[icon_num].history_path.setMap(null);
  }
  if (all_icon_list[icon_num].history_line != undefined && jQuery.isEmptyObject(all_icon_list[icon_num].history_line) == 0) {
    console.log('history_line: ' + all_icon_list[icon_num].history_line);
    all_icon_list[icon_num].history_line.remove();
    all_icon_list[icon_num].history_line = [];

    if (chart.series.length == 0) {
      $('#highchart').hide();
      $('#fuck_off').hide();
    }
  }
}

function set_time_out() {
  clearTimeout(timeout);

  timeout = setTimeout(function () {
    for (var i = 0; i < all_icon_list.length; i++) {
      if (all_icon_list[i].show == 2) {
        console.log("setTimeout in");
        icon_num = i;
        set_val_history_time();
      }
    }
    set_time_out();
  }, 10000);
}

function history_form() {
  $("#inlineRadio1").prop("checked", true);
  $('#myModal').modal('show');
}

function set_val_history_time() {
  console.log("icon_num  " + icon_num);
  all_icon_list[icon_num].show = 2;
  $('[id="icon_' + icon_num + '"]').css("background-color", color_shape[all_icon_list[icon_num].app_num]);
  $('[id="icon_' + icon_num + '"]').css("color", "white");

  if (all_app_list[all_icon_list[icon_num].app_num].kind >= 1 && all_app_list[all_icon_list[icon_num].app_num].kind <= 8) {
    if (all_icon_list[icon_num].history_marker != undefined) {
      console.log("all_icon_list[icon_num].history_marker != undefined-************");
      all_icon_list[icon_num].history_marker.setMap(null);
      google.maps.event.removeListener(all_icon_list[icon_num].history_marker_listener);
    }

    if (all_icon_list[icon_num].history == 0)  //0:active_marker
    {
      // map.setCenter({lat: all_icon_list[icon_num].lat, lng: all_icon_list[icon_num].lng});
      // all_icon_list[icon_num].info.open(map, all_icon_list[icon_num].marker);

      // all_icon_list[icon_num].marker.setVisible(true);
      set_val_history_line();
    }
    else if (all_icon_list[icon_num].history == 1)  //1:recent_minute
    {
      // map.setCenter({lat: all_icon_list[icon_num].lat, lng: all_icon_list[icon_num].lng});
      // all_icon_list[icon_num].marker.setVisible(true);
      set_val_history_line();
    }
    else if (all_icon_list[icon_num].history == 2)  //2:recent_hour
    {
      // map.setCenter({lat: all_icon_list[icon_num].lat, lng: all_icon_list[icon_num].lng});
      // console.log("all_icon_list[icon_num].history == 2");
      // all_icon_list[icon_num].marker.setVisible(true);
      set_val_history_line();
    }
  }
}

function set_val_history_line() {
  var set_icon_num = icon_num;
  $.getJSON($SCRIPT_ROOT + '/secure/history', {
    app_num: all_icon_list[set_icon_num].real_app_num,
    name: all_icon_list[set_icon_num].name,
    time: all_icon_list[set_icon_num].history
  }, function (data) {
    var history_list = data.result.map(function (obj) { return { lat: obj.lat, lng: obj.lng, value: obj.value, time: obj.time }; });

    // if(history_list.length == 0)
    // {
    //   console.log("history_list.length");

    // map.setCenter({lat: all_icon_list[set_icon_num].lat, lng: all_icon_list[set_icon_num].lng});
    // all_icon_list[set_icon_num].info.open(map, all_icon_list[set_icon_num].marker);
    //   all_icon_list[set_icon_num].marker.setVisible(true);
    //   return;
    // }

    if (all_app_list[all_icon_list[set_icon_num].app_num].kind >= 5 && all_app_list[all_icon_list[set_icon_num].app_num].kind <= 8)  //movable icon
      var history_marker = icon_style(all_icon_list[set_icon_num].app_num, history_list[history_list.length - 1].lat, history_list[history_list.length - 1].lng, history_list[history_list.length - 1].value);
    else  //stationary icon
      var history_marker = icon_style(all_icon_list[set_icon_num].app_num, all_icon_list[set_icon_num].lat, all_icon_list[set_icon_num].lng, history_list[history_list.length - 1].value);
    var history_marker_listener = icon_listener(set_icon_num, history_marker);
    all_icon_list[set_icon_num].history_marker = history_marker;
    all_icon_list[set_icon_num].history_marker_listener = history_marker_listener[0];
    all_icon_list[set_icon_num].history_info = history_marker_listener[1];
    if (all_app_list[all_icon_list[set_icon_num].app_num].kind == 1 || all_app_list[all_icon_list[set_icon_num].app_num].kind == 3 || all_app_list[all_icon_list[set_icon_num].app_num].kind == 5 || all_app_list[all_icon_list[set_icon_num].app_num].kind == 7) {
      all_icon_list[set_icon_num].history_marker.label.color = color_movable[all_icon_list[set_icon_num].app_num][all_icon_list[set_icon_num].count];
    }
    all_icon_list[set_icon_num].history_marker.setVisible(true);

    if (history_list.length >= 0) {
      // draw history chart
      var chart_history_list = [];
      for (var i = 0; i < history_list.length; i++) {
        chart_history_list.push([Date.parse(history_list[i].time), parseFloat(history_list[i].value)]);
      }

      if (all_icon_list[set_icon_num].history_line != undefined && jQuery.isEmptyObject(all_icon_list[set_icon_num].history_line) == 0) // history_line > 0
      {
        all_icon_list[set_icon_num].history_line.setData(chart_history_list);
      }
      else {
        chart.addSeries({
          name: all_icon_list[set_icon_num].name,
          data: chart_history_list,
          color: color_movable[all_icon_list[set_icon_num].app_num][all_icon_list[set_icon_num].count],
        });

        all_icon_list[set_icon_num].history_line = chart.series[chart.series.length - 1];
      }
      $('#highchart').show();
      $('#fuck_off').show();
    }


  });
}

function set_loc_history_time() {
  console.log("icon_num  " + icon_num);
  all_icon_list[icon_num].show = 1;

  $('[id="icon_' + icon_num + '"]').css("background-color", color_shape[all_icon_list[icon_num].app_num]);
  $('[id="icon_' + icon_num + '"]').css("color", "white");

  if (all_app_list[all_icon_list[icon_num].app_num].kind >= 1 && all_app_list[all_icon_list[icon_num].app_num].kind <= 4) {
    all_icon_list[icon_num].history = 0;
    if (all_app_list[all_icon_list[icon_num].app_num].show == 0) {
      // map.setCenter({lat: all_icon_list[icon_num].lat, lng: all_icon_list[icon_num].lng});
      // all_icon_list[icon_num].info.open(map, all_icon_list[icon_num].marker);
    }
    all_icon_list[icon_num].marker.setVisible(true);
  }
  else if (all_app_list[all_icon_list[icon_num].app_num].kind >= 5 && all_app_list[all_icon_list[icon_num].app_num].kind <= 8) {
    if (all_icon_list[icon_num].history_marker != undefined) {
      all_icon_list[icon_num].history_marker.setMap(null);
      google.maps.event.removeListener(all_icon_list[icon_num].history_marker_listener);
      all_icon_list[icon_num].history_marker = undefined;
    }
    if (all_icon_list[icon_num].history_path != undefined) {
      all_icon_list[icon_num].history_path.setMap(null);
      all_icon_list[icon_num].history_path = undefined;
    }

    if (all_icon_list[icon_num].history == 0)  //0:active_marker
    {
      all_icon_list[icon_num].history = 0;
      // map.setCenter({lat: all_icon_list[icon_num].lat, lng: all_icon_list[icon_num].lng});
      // all_icon_list[icon_num].info.open(map, all_icon_list[icon_num].marker);
      all_icon_list[icon_num].marker.setVisible(true);
    }
    else if (all_icon_list[icon_num].history == 1)  //1:recent_minute
    {
      all_icon_list[icon_num].history = 1;
      set_loc_history_path();
    }
    else if (all_icon_list[icon_num].history == 2)  //2:recent_hour
    {
      all_icon_list[icon_num].history = 2;
      set_loc_history_path();
    }
  }
}

function set_loc_history_path() {
  var set_icon_num = icon_num;
  $.getJSON($SCRIPT_ROOT + '/secure/history', {
    app_num: all_icon_list[icon_num].real_app_num,
    name: all_icon_list[icon_num].name,
    time: all_icon_list[icon_num].history
  }, function (data) {
    var history_list = data.result.map(function (obj) { return { lat: obj.lat, lng: obj.lng, value: obj.value, time: obj.time }; });
    if (all_icon_list[set_icon_num].show == 0) return;
    if (history_list.length == 0) {
      all_icon_list[set_icon_num].marker.setVisible(true);
      return;
    }
    all_icon_list[set_icon_num].marker.setVisible(false);
    all_icon_list[set_icon_num].info.close();

    if (all_icon_list[set_icon_num].history_marker != undefined) {
      all_icon_list[set_icon_num].history_marker.setMap(null);
      google.maps.event.removeListener(all_icon_list[set_icon_num].history_marker_listener);

    }
    if (all_icon_list[set_icon_num].history_path != undefined) {
      all_icon_list[set_icon_num].history_path.setMap(null);
      all_icon_list[set_icon_num].history_path = undefined;
    }

    var history_marker = icon_style(all_icon_list[set_icon_num].app_num, history_list[history_list.length - 1].lat, history_list[history_list.length - 1].lng, history_list[history_list.length - 1].value, history_list[history_list.length - 1].time);
    var history_marker_listener = icon_listener(set_icon_num, history_marker, history_list[history_list.length - 1].time);
    all_icon_list[set_icon_num].history_marker = history_marker;
    all_icon_list[set_icon_num].history_marker_listener = history_marker_listener[0];
    all_icon_list[set_icon_num].history_info = history_marker_listener[1];

    if (all_app_list[all_icon_list[set_icon_num].app_num].kind == 5 || all_app_list[all_icon_list[set_icon_num].app_num].kind == 7) {
      all_icon_list[set_icon_num].history_marker.label.color = color_movable[all_icon_list[set_icon_num].app_num][all_icon_list[set_icon_num].count];
    }
    all_icon_list[set_icon_num].history_marker.setVisible(true);
    var history_path = new google.maps.Polyline({
      path: history_list,
      geodesic: true,
      strokeColor: color_movable[all_icon_list[set_icon_num].app_num][all_icon_list[set_icon_num].count],
      strokeOpacity: 0.5,
      strokeWeight: 5,
    });

    all_icon_list[set_icon_num].history_path = history_path;
    all_icon_list[set_icon_num].history_path.setMap(map);
  });
}

function icon_style(app_num, lat, lng, value, time = "no") {
  if (all_app_list[app_num].kind == 1 || all_app_list[app_num].kind == 5) {
    var marker = new google.maps.Marker({
      position: { lat: lat, lng: lng },
      map: map,
      title: all_app_list[app_num].app,
      label: { text: value.toString(), fontSize: "20px" },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 18,
        strokeWeight: 2,
        fillColor: color_shape[app_num],
        fillOpacity: 1,
        strokeColor: color_shape[app_num]
      },
      visible: false,
      zIndex: 999
    });

    if (value.length == 0) //no value
      delete marker.label;
  }
  else if (all_app_list[app_num].kind == 2 || all_app_list[app_num].kind == 6) {
    var marker = new google.maps.Marker({
      position: { lat: lat, lng: lng },
      icon: all_app_list[app_num].picture,
      map: map,
      title: all_app_list[app_num].app,
      visible: false
    });
  }
  else if (all_app_list[app_num].kind == 3 || all_app_list[app_num].kind == 7) {
    if (value.length > 0)
      var text_str = all_app_list[app_num].icon + ': ' + value;
    else
      var text_str = all_app_list[app_num].icon;
    var marker = new google.maps.Marker({
      position: { lat: lat, lng: lng },
      map: map,
      title: all_app_list[app_num].app,
      label: { text: text_str.toString(), fontSize: "20px" },
      icon: {
        path: 'M-1.1 -0.3a0.2 0.2 0 0 1 0.2 -0.2h1.8a0.2 0.2 0 0 1 0.2 0.2v0.6000000000000001a0.2 0.2 0 0 1 -0.2 0.2h-1.8000000000000003a0.2 0.2 0 0 1 -0.2 -0.2z',
        scale: 24,
        strokeWeight: 2,
        fillColor: color_shape[app_num],
        fillOpacity: 1,
        strokeColor: color_shape[app_num]
      },
      visible: false,
      zIndex: 999
    });
  }
  else if (all_app_list[app_num].kind == 4 || all_app_list[app_num].kind == 8) {
    var marker = new google.maps.Marker({
      position: { lat: lat, lng: lng },
      map: map,
      title: all_app_list[app_num].app,
      label: { text: all_app_list[app_num].icon.toString(), fontSize: "25px" },
      icon: {
        path: 'M-0.5 -0.3a0.2 0.2 0 0 1 0.2 -0.2h0.6000000000000001a0.2 0.2 0 0 1 0.2 0.2v0.6000000000000001a0.2 0.2 0 0 1 -0.2 0.2h-0.6a0.2 0.2 0 0 1 -0.2 -0.2z',
        scale: 27,
        strokeWeight: 2,
        fillColor: color_range_decision(all_app_list[app_num].color_min, all_app_list[app_num].color_max, value),
        fillOpacity: 1,
        strokeColor: color_range_decision(all_app_list[app_num].color_min, all_app_list[app_num].color_max, value)
      },
      visible: false,
      zIndex: 999
    });
    console.log(all_app_list[app_num].app);
  }

  //offline judge
  if (time != "no") {
    var dt = new Date();
    dt.setHours(dt.getHours() - offline_hours);
    //if past update time one hour over, changing strokeColor.
    if (dt > new Date(time))
      marker.icon.strokeColor = '#000000';
  }

  return marker;
}

function color_range_decision(min, max, value) {
  console.log(min);
  console.log(max);
  console.log(value);
  for (var i = 0; i < 5; i++) {
    if (value >= (min + (max - min) * (i / 5)) && value <= (min + (max - min) * ((i + 1) / 5))) {
      return color_range[i];
    }
    else if (value > max) {
      return color_range[4];
    }
    else if (value < min) {
      return color_range[0];
    }
  }
}

function icon_listener(icon, marker, time = "no") {
  if (all_app_list[all_icon_list[icon].app_num].app == "Camera") {
    var info = new google.maps.InfoWindow({
      content: all_icon_list[icon].description
    });

    var marker_listener = marker.addListener('click', function () {
      resetCenter(marker);
      cam_src = all_icon_list[icon].description;
      $('#Video-Display').attr('src', $('#Video-Display').attr('src'));
      $('#Video-Display').show();
      $('#fuck_off').show();
    });
    return [marker_listener, info];
  }
  else {
    var content_text = all_icon_list[icon].description;
    content_text = content_text.replace(/((http|https|ftp):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g, '<a target="_blank" href="$1">$1</a> ');
    if (content_text.length > 0)
      content_text = content_text + '<br>';
    //latest update time
    if (time != "no") {
      var dt = new Date(time);
      time = dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate() + " " + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
      content_text = content_text + 'Update Time: ' + time + '<br>';
    }
    if (all_app_list[all_icon_list[icon].app_num].kind >= 5 && all_app_list[all_icon_list[icon].app_num].kind <= 8)
      content_text = content_text + '<button type="button" style="border-color:black ;background-color:  #eee; height:30px width:70px; color:#337ab7" class="history btn btn-outline-primary" id="history_btn" value="' + icon + '">History</button>';
    var info = new google.maps.InfoWindow({
      content: content_text
    });
    var marker_listener = marker.addListener('click', function () {
      info.open(map, marker);
      icon_num = icon;
      app_num = all_icon_list[icon].app_num;
    });
    return [marker_listener, info];
  }
}

function resetCenter(marker) {
  var high = $("#Location-map").height();
  var high_cam = $("#Video-Display").height();
  var bounds = map.getBounds();
  var ne = bounds.getNorthEast(); // LatLng of the north-east corner
  var sw = bounds.getSouthWest(); // LatLng of the south-west corder
  var LatLng = marker.getPosition();
  var percent = ((high - high_cam) / 2) / high;
  var cen = sw.lat() + (ne.lat() - sw.lat()) * percent;
  var latlng = new google.maps.LatLng({ lat: map.getCenter().lat() - (cen - LatLng.lat()), lng: LatLng.lng() });
  map.setCenter(latlng);
}

var map_init_geoOptions = {
  timeout: 10 * 1000
}

var map_init_geoSuccess = function (position) {
  console.log('geoSuccess map_init');
  geolocation_init = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };
  initialize_map();
  setTimeout(() => {
    hash_tag_check();
    query_string_check();
  }, 2000);
  load_all_app();
  initialize_RoutingService();
  initialize_chart();
};
var map_init_geoError = function (error) {
  geolocation_init = { lat: default_map_center.lat, lng: default_map_center.lng };
  console.log('Error occurred. Error code: ' + error.code);
  initialize_map();
  setTimeout(() => {
    hash_tag_check();
    query_string_check();
  }, 2000);
  load_all_app();
  initialize_RoutingService();
  initialize_chart();
  // error.code can be:
  //   0: unknown error
  //   1: permission denied
  //   2: position unavailable (error response from location provider)
  //   3: timed out
};

//Do after js files loading finish
$(function () {
  navigator.geolocation.getCurrentPosition(map_init_geoSuccess, map_init_geoError, map_init_geoOptions);

  $(document).on('click', '#button_route', function () {
    if (flag_route == 0) {
      if (listener_routing_start != undefined) google.maps.event.removeListener(listener_routing_start);
      if (listener_routing_end != undefined) google.maps.event.removeListener(listener_routing_end);
      flag_route = 1;
      flag_routing = 0;
      $('#input_destination').show();
      $('#autocomplete_end').val('');
      $('#autocomplete_start').val('');

      $("#text").html('End Routing');
      $('#button_route').addClass('active');
      initAutocomplete();
      CirclesetBounds();
    }
    else //flag_route == 1
    {
      flag_route = 0;
      flag_routing = 1;
      if (flightPath_routing != null) {
        flightPath_routing.setMap(null);
        flightPath_routing = null;
      }
      console.log(flightPath_routing);
      if (marker_routing_end != null) {
        marker_routing_end.setMap(null);
        marker_routing_end = null;
        google.maps.event.removeListener(listener_routing_end);
      }
      if (marker_routing_start != null) {
        marker_routing_start.setMap(null);
        marker_routing_start = null;
        google.maps.event.removeListener(listener_routing_start);
      }

      if (marker_routing_now != null) marker_routing_now.setMap(null);
      $('#input_destination').hide();
      $("#text").html('Routing');
      $('#button_route').removeClass('active');
    }

    if (flag_routing == 0) {
      flag_routing = 1;
      getLocation(addMarker_routing);
    }
  });

  $("#autocomplete_start").focus(function () {
    console.log("autocomplete_start focus in");
    if (listener_routing_end != undefined) google.maps.event.removeListener(listener_routing_end);
    if (listener_routing_start != undefined) google.maps.event.removeListener(listener_routing_start);
    listener_routing_start = google.maps.event.addListener(map, 'click', function (event) {
      start_loc = event.latLng;
      if (marker_routing_start != null) marker_routing_start.setMap(null);
      marker_routing_start = new google.maps.Marker({
        position: start_loc,
        label: "起點",
        map: map
      });
      marker_routing_start.addListener('click', function () {
        marker_routing_start.setMap(null);
        $('#autocomplete_start').val('');
      });
      $('#autocomplete_start').val("(" + start_loc.lat().toFixed(8) + ", " + start_loc.lng().toFixed(8) + ")");
    });
  });

  $("#autocomplete_end").focus(function () {
    console.log("autocomplete_end focus in");
    if (listener_routing_start != undefined) google.maps.event.removeListener(listener_routing_start);
    if (listener_routing_end != undefined) google.maps.event.removeListener(listener_routing_end);
    listener_routing_end = google.maps.event.addListener(map, 'click', function (event) {
      end_loc = event.latLng;
      if (marker_routing_end != null) marker_routing_end.setMap(null);
      marker_routing_end = new google.maps.Marker({
        position: end_loc,
        label: "終點",
        map: map
      });
      marker_routing_end.addListener('click', function () {
        marker_routing_end.setMap(null);
        $('#autocomplete_end').val('');
      });
      $('#autocomplete_end').val("(" + end_loc.lat().toFixed(8) + ", " + end_loc.lng().toFixed(8) + ")");//end_loc
    });
  });

  $(document).on('click', '#button_start_routing', function () {
    console.log("Start Routing");
    if (listener_routing_start != undefined) google.maps.event.removeListener(listener_routing_start);
    if (listener_routing_end != undefined) google.maps.event.removeListener(listener_routing_end);
    count = 0;
    setRoutePoint();
    calcRoute(count);
  });

  $(document).on('click', '#get_current_location_btn', function () {
    if (window.trackingCoord != null) {
      console.log("get_current_location_btn", "trackingCoord");
      map.setCenter(window.trackingCoord);
    }
    else {
      console.log("get_current_location_btn", "CurrentPosition");
      getLocation(addMarker_routing);
      marker_routing_now_timeout();
    }
  });

  $(document).on('click', '#fuck_off', function () {
    cam_src = undefined;
    $('#Video-Display').attr('src', $('#Video-Display').attr('src'));
    $('#Video-Display').hide();
    $('#highchart').hide();
    $('#fuck_off').hide();
  });

  $(document).click(function (e) {
    if (!$(e.target).is('.list-group-item')) {
      $('.collapse').collapse('hide');
    }
  });

  $(document).on('click', '#history_btn', function () {
    icon_num = $(this).val();
    app_num = all_icon_list[icon_num].app_num;
    history_form();
  });

  $(window).on("orientationchange", function () {
    console.log("orientationchange");
    resizeIframe(1000, $('#Video-Display')[0]);
  });

  socket.on('server_response', function (msg) { //[app_num, lat, lng, name, value, time]
    console.log(msg.data);
    var exist = 0, socket_icon_num;

    // msg.data[5] = new Date(msg.data[5]);  //傳入的其實是台灣時間
    // msg.data[5].setTime( msg.data[5].getTime() + (-msg.data[5].getTimezoneOffset()/60-8)*60*60*1000); //調回當地時間

    if (parseInt(msg.data[0]) != 10 && parseInt(msg.data[0]) != 11) {
      for (var i = 0; i < all_icon_list.length; i++) {
        if (all_icon_list[i].real_app_num == msg.data[0] && all_icon_list[i].name == msg.data[3]) {
          msg.data[5] = new Date(msg.data[5]);  //傳入的其實是台灣時間
          msg.data[5].setTime(msg.data[5].getTime() + (-msg.data[5].getTimezoneOffset() / 60 - 8) * 60 * 60 * 1000); //調回當地時間

          exist = 1;
          socket_icon_num = i;
          all_icon_list[i].marker.setMap(null);
          google.maps.event.removeListener(all_icon_list[i].marker_listener);

          if (all_app_list[all_icon_list[i].app_num].kind >= 5 && all_app_list[all_icon_list[i].app_num].kind <= 8) {
            all_icon_list[i].lat = parseFloat(msg.data[1]);
            all_icon_list[i].lng = parseFloat(msg.data[2]);
          }

          var marker = icon_style(all_icon_list[i].app_num, all_icon_list[i].lat, all_icon_list[i].lng, msg.data[4], msg.data[5]);
          var marker_listener = icon_listener(i, marker, msg.data[5]);
          all_icon_list[i].marker = marker;
          all_icon_list[i].marker_listener = marker_listener[0];
          all_icon_list[i].info = marker_listener[1];

          if (all_icon_list[i].show == 1 && all_icon_list[i].history == 0)
            all_icon_list[i].marker.setVisible(true);
          break;
        }
      }
      if (exist == 0) {
        for (var i = 0; i < all_app_list.length; i++) {
          if (all_app_list[i].number == msg.data[0] && all_app_list[i].kind >= 5 && all_app_list[i].kind <= 8) {
            msg.data[5] = new Date(msg.data[5]);  //傳入的其實是台灣時間
            msg.data[5].setTime(msg.data[5].getTime() + (-msg.data[5].getTimezoneOffset() / 60 - 8) * 60 * 60 * 1000); //調回當地時間

            exist = 1;
            all_icon_list.push({
              'app_num': Number(msg.data[0]),
              'name': msg.data[3],
              'lat': parseFloat(msg.data[1]),
              'lng': parseFloat(msg.data[2]),
              'value': parseFloat(msg.data[4]),
              'time': parseFloat(msg.data[5]),
            });
            all_icon_list[all_icon_list.length - 1].description = all_icon_list[all_icon_list.length - 1].name;
            socket_icon_num = all_icon_list.length - 1;
            console.log("new " + all_icon_list[all_icon_list.length - 1].name);
            set_all_icon(all_icon_list.length - 1, all_icon_list[all_icon_list.length - 1].value, i, all_icon_list[all_icon_list.length - 1].time);
            break;
          }
        }
        // if(exist == 0)
        // {
        //   load_all_app();
        // }
      }
    } else {
      load_specific_app(parseInt(msg.data[0]));
    }

    if (msg.data[3] == window.person && msg.data[0] == window.trackingAppNum) {
      window.trackingCoord = { lat: parseFloat(msg.data[1]), lng: parseFloat(msg.data[2]) };
      if (all_icon_list[socket_icon_num].show == 0)
        show_tracking_target(socket_icon_num, parseFloat(msg.data[1]), parseFloat(msg.data[2]), map);
    }
  });

  $(document).on('click', '#loc_history', function () {
    console.log("loc_history");
    form = document.getElementById("history_trace");
    //取得radio的值
    for (var i = 0; i < form.optradio.length; i++) {
      if (form.optradio[i].checked) {
        optradio = form.optradio[i].value;
        break;
      }
    }
    all_icon_list[icon_num].history = optradio;
    map.setCenter({ lat: all_icon_list[icon_num].lat, lng: all_icon_list[icon_num].lng });
    map.setZoom(16);
    if (all_icon_list[icon_num].show == 0)
      add_app_show_count();
    set_loc_history_time();

    if (interval != null) window.clearInterval(interval);
    interval = setInterval(function () {
      for (var i = 0; i < all_icon_list.length; i++) {
        if (all_icon_list[i].show == 1) {
          icon_num = i;
          set_loc_history_time();
        }
      }
    }, 10000);
  });

  $(document).on('click', '#val_history', function () {
    console.log("val_history");
    form = document.getElementById("history_trace");
    //取得radio的值
    for (var i = 0; i < form.optradio.length; i++) {
      if (form.optradio[i].checked) {
        optradio = form.optradio[i].value;
        break;
      }
    }

    if (all_app_list[app_num].show > 0)  //show all
    {
      all_app_list[app_num].show = 2;
      $('[id="show_' + app_num + '"]').css("background-color", color_shape[app_num]);
      $('[id="show_' + app_num + '"]').css("color", "white");
      $('[id="show_' + app_num + '"]').html('Hide All');

      for (var j = 0; j < all_icon_list.length; j++) {
        if (all_icon_list[j].app_num == app_num) {
          icon_num = j;
          all_icon_list[icon_num].history = optradio;
          if (all_icon_list[j].show == 0)
            add_app_show_count();
          set_val_history_time();
        }
      }
    }
    else  //solo icon
    {
      all_icon_list[icon_num].history = optradio;
      map.setCenter({ lat: all_icon_list[icon_num].lat, lng: all_icon_list[icon_num].lng });
      map.setZoom(16);
      if (all_icon_list[icon_num].show == 0)
        add_app_show_count();
      set_val_history_time();
    }

    set_time_out();
  });

  //偵測手機頁面狀態
  document.onvisibilitychange = function () {
    if (document.visibilityState == "visible") {
      if (left == 1) {
        //回復頁面時刷新timer
        left = 0;
        for (var i = 0; i < all_icon_list.length; i++) {
          if (all_icon_list[i].show == 1) {
            icon_num = i;
            set_loc_history_time();
          }
        }
        if (interval != null) window.clearInterval(interval);
        interval = setInterval(function () {
          for (var i = 0; i < all_icon_list.length; i++) {
            if (all_icon_list[i].show == 1) {
              icon_num = i;
              set_loc_history_time();
            }
          }
        }, 10000);
      }
    } else {
      left = 1;
      if (interval != null) window.clearInterval(interval);
    }
  }

});

