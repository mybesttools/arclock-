var Timer_UpdateMeasures;
var tab_pane;
/******************************
   ADD ANIMATION TO THE TEXT    
  ******************************/
var count = 0;
var number = 10;

var interval = setInterval(function () {
  count++;
  if (count === 1) { init_page();}
  if (count === number) {
    clearInterval(interval);
    $("h1 ,h2").addClass("animationActive");
  }
}, 50);

var blocked = false;

/*
 * Handle dynamic updates, such as slider dragging
 */
function update() {
  /*
   * Setup request, including a callback that runs any
   * subsequent requests on completion
   */
  var form = new FormData(document.getElementById("form"));
  var request = new XMLHttpRequest();
  request.open("POST", "/update", true);
  request.addEventListener("load", (event) => (blocked = false));

  /*
   * Run if we can
   */
  if (!blocked) {
    request.send(form);
    blocked = true;
  }
}

/*
 * Handle full update, such as selecting from a list
 */
function change() {
  var form = document.getElementById("form");
  var request = new XMLHttpRequest();
  request.open("POST", "/change", true);
  request.send(new FormData(form));
}

/*
 * Display a message ticker
 */
function show() {
  var form = document.getElementById("form");
  var request = new XMLHttpRequest();
  request.open("POST", "/show", true);
  request.send(new FormData(form));
  return false;
}

/*
 * init all
 * due to memory constraints
 */
function init_page() {

  //init timezone selector
  var request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      var select = document.getElementById("timezone");
      function add_selector(item) {
        node = document.createElement("OPTION");
        if (item == timezone) {
          node.selected = true;
        }
        node.label = item;
        node.textContent = item;
        select.appendChild(node);
      }

      var timezones = JSON.parse(this.responseText);
      timezones.forEach(add_selector);
      /*********************
         SET ROW'S HEIGHT
        *********************/
      $.each($(".row"), function () {
        var h = $(this).attr("data-height");
        $(this).css("height", h);
      });

      /*************************
         ON WINDOW SCROLL FUNCTION
        *************************/
      var sectionIds = {};

      $(".row-nav").each(function () {
        var $this = $(this);
        sectionIds[$this.attr("id")] = $this.first().offset().top - 120;
      });

      var count2 = 0;
      $(window).scroll(function (event) {
        var scrolled = $(this).scrollTop();

        //If it reaches the top of the row, add an active class to it
        $(".row-nav").each(function () {
          var $this = $(this);

          if (scrolled >= $this.first().offset().top - 120) {
            $(".row-nav").removeClass("active");
            $this.addClass("active");

            $(".animation").removeClass("animationActive");
            $this.find(".animation").addClass("animationActive");
          }
        });

        //when reaches the row, also add a class to the navigation
        for (key in sectionIds) {
          if (scrolled >= sectionIds[key]) {
            $(".nav-btn").removeClass("active");
            var c = $("[data-row-id=" + key + "]");
            c.addClass("active");

            var i = c.index();
            $("#nav-indicator").css("left", i * 100 + "px");
          }
        }

        //Check if we've reached the top
        if (scrolled > count2) {
          count2++;
        } else {
          count2--;
        }

        count2 = scrolled;

        if (count2 == 0) {
          $("h1 ,h2").addClass("animationActive");
        } else {
          $("h1 ,h2").removeClass("animationActive");
        }
      });


      /**************
         IN-NAVIGATION
        **************/
      $(".nav-btn").click(function () {
        $(this).addClass("active");
        $(this).siblings().removeClass("active");

        var i = $(this).index();
        $("#nav-indicator").css("left", i * 100 + "px");

        var name = $(this).attr("data-row-id");
        var id = "#" + name;
        var top = $(id).first().offset().top - 60;
        $("html, body").animate({ scrollTop: top + "px" }, 300);
      });

      /*****
         TOP
        ******/
      $("#top").click(function () {
        $("html, body").animate({ scrollTop: "0px" }, 300);
      });


    }
  };

  request.open("GET", "/timezones", true);
  request.send();
}

/*
 * Load one of the cheesy presets
 */
function load_preset() {
  var request = new XMLHttpRequest();
  var select = document.getElementById("preset");
  request.open("POST", "/load_preset", false);
  var formdata = new FormData();
  formdata.append("preset", select.options[select.selectedIndex].text);
  request.send(formdata);
  location.reload(true);
  return false;
}

google.charts.load("current", {
  packages: ["corechart", "line", "bar", "gauge"]
});
google.charts.setOnLoadCallback(drawChart);

function drawChart() {
  // https://developers.google.com/chart/interactive/docs/reference?csw=1#datatable-class
  var options1 = {
    title: "Temperature and Humidity",
    legend: "bottom",
    series: {
      // Gives each series an axis name that matches the Y-axis below.
      0: { axis: "temperature" },
      1: { axis: "humidity" }
    },
    axes: {
      // Adds labels to each axis; they don't have to match the axis names.
      y: {
        temperature: { label: "Temperature (°C)" },
        humidity: { label: "Humidity (%)" }
      }
    }
  };
  var options2 = {
    title: "Air Pressure",
    legend: { position: "none" }
  };
  var optionsGauge = {
    redFrom: 960,
    redTo: 990,

    yellowFrom: 990,
    yellowTo: 1030,

    greenFrom: 1030,
    greenTo: 1080,

    minorTicks: 10,

    min: 960,
    max: 1080,

    animation: {
      duration: 400,
      easing: "out"
    }
  };
  // Objets graphiques - Charts objects
  var chartTemp = new google.visualization.AreaChart(
    document.getElementById("chartTemp")
  );
  var barTemp = new google.charts.Bar(document.getElementById("barTemp"));
  var chartPA = new google.visualization.AreaChart(
    document.getElementById("chartPA")
  );
  var gaugePA = new google.visualization.Gauge(
    document.getElementById("gaugePA")
  );
  // Données - Data
  dataGaugePA = new google.visualization.DataTable();
  dataChartTemp = new google.visualization.DataTable();
  dataBarTemp = new google.visualization.DataTable();
  dataChartPA = new google.visualization.DataTable();

  // Gauge Pression Atmospherique - Gauge Atmosph. pressure
  dataGaugePA.addColumn("string", "Label");
  dataGaugePA.addColumn("number", "Value");
  dataGaugePA.addRows(1);

  // Line chart temp/humidity
  dataChartTemp.addColumn("timeofday", "Temps");
  dataChartTemp.addColumn("number", "Temperature");
  dataChartTemp.addColumn("number", "Humidité");

  // Bar temp/humidity
  dataBarTemp.addColumn("string", "Moyennes");
  dataBarTemp.addColumn("number", "Temperature");
  dataBarTemp.addColumn("number", "Humidité");

  // Line Chart PA
  dataChartPA.addColumn("timeofday", "Temps");
  dataChartPA.addColumn("number", "Pression Atmosphérique");

  // Force l'actualisation du graphique au 1er lancement - Force chart update first launch
  var firstStart = true;
  updateGraphs();
  // Actualise à intervalle régulier les graphiques - auto-update charts
  setInterval(updateGraphs, 10000); //60000 MS == 1 minutes

  function updateGraphs() {
    // Uniquement si le panneau des graphs est actif - only if chart panel is active
    if ((tab_pane == "#tab_graphs") | firstStart) {
      firstStart = false;
      $.getJSON("/graph_temp.json", function (json) {
        console.log(
          "Measurements: " +
            JSON.stringify(data) +
            "|" +
            data.t +
            "|" +
            data.h +
            "|" +
            data.pa
        );
        var _dataT = [];
        var _dataPA = [];
        var _dataBarTemp = [];
        var _dataBarPA = [];

        // Data line chart
        for (var i = 0; i < json.timestamp.length; i++) {
          var d = new Date(json.timestamp[i] * 1000);
          _dataT.push([
            [d.getHours(), d.getMinutes(), d.getSeconds()],
            json.t[i],
            json.h[i]
          ]);
          _dataPA.push([
            [d.getHours(), d.getMinutes(), d.getSeconds()],
            json.pa[i]
          ]);
        }
        for (var i = 0; i < json.bart.length; i++) {
          _dataBarTemp.push([i - 7 + "h", json.bart[i], json.barh[i]]);
        }

        dataGaugePA.setValue(0, 0, "mbar");
        dataGaugePA.setValue(0, 1, json.pa[0]);
        dataChartTemp.addRows(_dataT);
        dataChartPA.addRows(_dataPA);
        dataBarTemp.addRows(_dataBarTemp);

        // Efface les anciennes values - Erase old data
        var nbRec = dataChartTemp.getNumberOfRows() - json.timestamp.length;
        if (dataChartTemp.getNumberOfRows() > json.timestamp.length) {
          dataChartTemp.removeRows(0, nbRec);
          dataChartPA.removeRows(0, nbRec);
        }
        nbRec = dataBarTemp.getNumberOfRows() - json.bart.length;
        if (dataBarTemp.getNumberOfRows() > json.bart.length) {
          dataBarTemp.removeRows(0, nbRec);
        }
        // Masque ou affiche l'histogramme - hide or sho bar graph
        if (dataBarTemp.getNumberOfRows() == 0) {
          $("#zeroDataTemp").show();
          $("#barTemp").hide();
        } else {
          $("#zeroDataTemp").hide();
          $("#barTemp").show();
        }
        // Affiche les graphiques - display charts
        gaugePA.draw(dataGaugePA, optionsGauge);
        chartTemp.draw(dataChartTemp, options1);
        barTemp.draw(dataBarTemp, options1);
        chartPA.draw(dataChartPA, options2);
      }).fail(function (err) {
        console.log("err getJSON graph_temp.json " + JSON.stringify(err));
      });
    }
  }
}

$('a[data-toggle="tab"]').on("shown.bs.tab", function (e) {
  clearTimeout(Timer_UpdateMeasures);
  tab_pane = $(e.target).attr("href");
  console.log("activated " + tab_pane);

  // IE10, Firefox, Chrome, etc.
  if (history.pushState) window.history.pushState(null, null, tab_pane);
  else window.location.hash = tab_pane;

  if (tab_pane == "#tab_measures") {
    $("#table_measures").bootstrapTable("refresh", {
      silent: true,
      url: "/tabmeasures.json"
    });
  }
});

//Create a timer to update data every n secondes
$("#tab_measures").on("load-success.bs.table", function (e, data) {
  console.log("tab_measures loaded");
  if ($(".nav-tabs .active > a").attr("href") == "#tab_measures") {
    Timer_UpdateMeasures = setTimeout(function () {
      $("#table_Measures").bootstrapTable("refresh", {
        silent: true,
        showLoading: false,
        url: "/tabmeasures.json"
      });
      updateMeasures();
    }, 10000);
  }
});

function updateMeasures() {
  $.getJSON("/measures.json", function (data) {
    console.log(
      "Measures : " +
        JSON.stringify(data) +
        "|" +
        data.t +
        "|" +
        data.h +
        "|" +
        data.pa
    );
    $("#temperature").html(data.t);
    $("#humidity").html(data.h);
    $("#pa").html(data.pa);
  }).fail(function (err) {
    console.log("err getJSON Measures.json " + JSON.stringify(err));
  });
}

function labelFormatter(value, row) {
  console.log("labelFormatter");
  console.log(value);
  console.log(row);
  var label = "";
  if (value === "Temperature") {
    label =
      value + "<span class='glyphicon " + row.glyph + " pull-left'></span>";
    $("#labelTemp").html(
      "&nbsp;" +
        value +
        "&nbsp;" +
        "<span class='badge'> " +
        row.value +
        row.unit +
        "</span><span class='glyphicon " +
        row.glyph +
        " pull-left'></span>"
    );
  } else if (value === "Humidité") {
    label =
      value + "<span class='glyphicon " + row.glyph + " pull-left'></span>";
    $("#labelHumi").html(
      "&nbsp;" +
        value +
        "&nbsp;" +
        "<span class='badge'> " +
        row.value +
        row.unit +
        "</span><span class='glyphicon " +
        row.glyph +
        " pull-left'></span>"
    );
  } else if (value === "Pression Atmosphérique") {
    label =
      value + "<span class='glyphicon " + row.glyph + " pull-left'></span>";
    $("#labelPa").html(
      "&nbsp;" +
        value +
        "&nbsp;" +
        "<span class='badge'> " +
        row.value +
        row.unit +
        "</span><span class='glyphicon " +
        row.glyph +
        " pull-left'></span>"
    );
  } else {
    label = value;
  }
  return label;
}
function valueFormatter(value, row) {
  //console.log("valueFormatter");
  var label = "";
  if (row.value > row.precedente) {
    label =
      value +
      row.unit +
      "<span class='glyphicon glyphicon-chevron-up pull-right'></span>";
  } else {
    label =
      value +
      row.unit +
      "<span class='glyphicon glyphicon-chevron-down pull-right'></span>";
  }
  return label;
}
function vpFormatter(value, row) {
  //console.log("valueFormatter");
  var label = "";
  if (row.value > row.precedente) {
    label = value + row.unit;
  } else {
    label = value + row.unit;
  }
  return label;
}

//GPIO change
$("#D5_On").click(function () {
  setButton("D5", "1");
});
$("#D5_Off").click(function () {
  setButton("D5", "0");
});
$("#D6_On").click(function () {
  setButton("D6", "1");
});
$("#D6_Off").click(function () {
  setButton("D6", "0");
});
$("#D7_On").click(function () {
  setButton("D7", "1");
});
$("#D7_Off").click(function () {
  setButton("D7", "0");
});
$("#D8_On").click(function () {
  setButton("D8", "1");
});
$("#D8_Off").click(function () {
  setButton("D8", "0");
});

function setButton(id, etat) {
  $.post("gpio?id=" + id + "&etat=" + etat)
    .done(function (data) {
      //console.log("Retour setButton " + JSON.stringify(data));
      var id_gpio = "#" + id + "_etat";
      //console.log(data);
      if ((data.success === "1") | (data.success === 1)) {
        if (data.etat === "1") {
          $(id_gpio).html("ON");
        } else {
          $(id_gpio).html("OFF");
        }
      } else {
        $(id_gpio).html("!");
      }
    })
    .fail(function (err) {
      console.log("err setButton " + JSON.stringify(err));
    });
}

// Change current theme
// Adapted from : https://wdtz.org/bootswatch-theme-selector.html
var supports_storage = supports_html5_storage();
if (supports_storage) {
  var theme = localStorage.theme;
  console.log("Load theme " + theme);
  if (theme) {
    set_theme(get_themeUrl(theme));
  }
}

jQuery(function ($) {
  $("body").on("click", ".change-style-menu-item", function () {
    var theme_name = $(this).attr("rel");
    console.log("Change theme " + theme_name);
    var theme_url = get_themeUrl(theme_name);
    console.log("URL theme : " + theme_url);
    set_theme(theme_url);
  });
});

function get_themeUrl(theme_name) {
  $("#labelTheme").html("Theme : " + theme_name);
  var url_theme = "";
  if (theme_name === "bootstrap") {
    url_theme =
      "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css";
  } else {
    url_theme =
      "https://maxcdn.bootstrapcdn.com/bootswatch/3.3.7/" +
      theme_name +
      "/bootstrap.min.css";
  }
  if (supports_storage) {
    // Save into the local database the selected theme
    localStorage.theme = theme_name;
  }
  return url_theme;
}
// Apply theme
function set_theme(theme_url) {
  $('link[title="main"]').attr("href", theme_url);
}
// local storage available ?
function supports_html5_storage() {
  try {
    console.log("local storage available");
    return "localStorage" in window && window["localStorage"] !== null;
  } catch (e) {
    console.log("local storage NOT available");
    return false;
  }
}
$(window).on("scroll", function() {
  $(".bottom-row").css({
    "position":"absolute",
    "bottom":0,
    "width":"100%",
    "top": ($(window).scrollTop()+ $(window).height())-50 + "px",
    "left": ($(window).scrollLeft()) + "px"
  });
});