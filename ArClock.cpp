/*
 * ArClock
 * 
 * (c) Matt Aubury 2020
 */
 
#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <ESP8266WebServer.h>
#include <DNSServer.h>
#include <Pinger.h>

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wsign-compare" /* rolls eyes */
#include <Adafruit_GFX.h>
#include <Fonts/Picopixel.h>
#pragma GCC diagnostic pop

#include <LittleFS.h>

#include <NeoPixelBrightnessBus.h>

#define FASTLED_INTERNAL /* suppress warnings */
#define HISTORY_FILE "/history.json"
#include <FastLED.h>

#include <time.h>
#include <sys/time.h>
#include <ArduinoJson.h>

float   t = 0 ;
float   h = 0 ;
float   pa = 0;
int     sizeHist = 84 ;        // Taille historique (7h x 12pts) - History size 

StaticJsonDocument<5000> root;                 //  Current JSON static buffer
JsonArray timestamp = root.createNestedArray("timestamp");
JsonArray hist_t = root.createNestedArray("t");
JsonArray hist_h = root.createNestedArray("h");
JsonArray hist_pa = root.createNestedArray("pa");
JsonArray bart = root.createNestedArray("bart");   // Clé historgramme (temp/humidité) - Key histogramm (temp/humidity)
JsonArray barh = root.createNestedArray("barh");   // Clé historgramme (temp/humidité) - Key histogramm (temp/humidity)

char json[5000];                                   // Buffer pour export du JSON - JSON export buffer

/**************************************************************************/

/*
 * Definition of the LED matrix layout 
 */
constexpr uint8_t PanelWidth = 32;
constexpr uint8_t PanelHeight = 8;
constexpr uint16_t PixelCount = PanelWidth * PanelHeight;

NeoTopology<ColumnMajorAlternating180Layout> topo (PanelWidth, PanelHeight);
NeoPixelBrightnessBus<NeoGrbFeature, Neo800KbpsMethod> strip (PixelCount);

/**************************************************************************/

/*
 * Networking globals
 */
DNSServer dnsServer;
ESP8266WebServer server (80);
IPAddress APIP (192, 168, 4, 1);
WiFiClient client;
Pinger pinger;

/**************************************************************************/

/*
 * Additional global state
 */
int16_t year = 0;
int8_t month = 0;
int8_t day = 0;
int8_t hours = 0;
int8_t minutes = 0;
int8_t seconds = 0;
int16_t ping_time = 1000;
int16_t ping_history[PanelWidth];
float celsius = -99; /* bit nippy */
  
/**************************************************************************/

/*
 * Include the functionality
 */
#include "text_font.h"
#include "timezones.h"
#include "web.h"
#include "clock.h"
#include "effect.h"
#include "settings.h"
#include "weather.h"
#include "message.h"
#include "wifi_logo.h"

/**************************************************************************/

void setup ()
{ 
  /*
   * Setup serial for debug
   */
  Serial.begin (115200);
  while (!Serial);

  /*
   * Configure strip
   */
  strip.Begin ();
  strip.SetPixelColor (0, RgbColor (0x40, 0x00, 0x00));
  strip.Show ();

  /*
   * Load settings from flash
   * 
   * Comment this out if you think you've corrupted your settings - 
   * e.g. if you're seeing a boot loop. Don't forget to put it back
   * when you've fixed the problem!
   */
  load_settings ();

  /*
   * Start WiFi in station mode if possible
   */
  WiFi.mode (WIFI_STA);
  WiFi.persistent (false);
  if (settings.at (F("ssid")) != "")
  {
    Serial.print (F("Connecting to "));
    Serial.print (settings.at (F("ssid")));
    WiFi.begin (settings.at (F("ssid")), settings.at (F("password")));
  
    /*
     * Wait for WiFi to connect before starting up MDNS
     */
    auto timeout = millis () + (30 * 1000);
    while (WiFi.status () != WL_CONNECTED && millis () < timeout)
    {
      wifi_logo (RgbColor (0x80, 0x80, 0x80));
      delay (15);
    }
  }

  /*
   * We either succeeded in connecting to a network, or failed (because
   * the details are wrong or missing)
   */
  if (WiFi.status () == WL_CONNECTED)
  {
    Serial.print (F("\nIP address: "));
    Serial.println (WiFi.localIP ());
    
    /*
     * Start mDNS responder, so we can be found as http://arclock.local
     */
    MDNS.begin (F("arclock"));

    /*
     * Setup pinger
     */
    pinger.OnReceive ([] (const PingerResponse &response)
    {
      if (response.DestIPAddress == IPAddress (255, 255, 255, 255))
      {
        /*
         * Bail if the target is invalid
         */
        return false;
      }

      /*
       * 1000 == failure
       */
      ping_time = response.ReceivedResponse ? response.ResponseTime : 1000;
      for (int x = 1; x != PanelWidth; ++x)
      {
        ping_history[x - 1] = ping_history[x];
      }
      ping_history[PanelWidth - 1] = ping_time;
      return true;
    });

    /*
     * Indicate to the user that WiFi is up
     */
    for (int N = 0x200; N >= 0; N -= 3)
    {
      wifi_logo (RgbColor (N > 0x180 ? N - 0x180 : 0, N > 0x100 ? 0x80 : (N > 0x80 ? N - 0x80 : 0), N > 0x180 ? N - 0x180 : 0));
      delay (15);
    }
    String message (F("Visit http://arclock.local or http://"));
    message += WiFi.localIP ().toString ();
    message += F(" to configure");
    show_message (message);
  }
  else
  {
    /*          
     * Start SoftAP mode with captive portal
     */
    WiFi.mode (WIFI_AP);
    WiFi.softAPConfig (APIP, APIP, IPAddress (255, 255, 255, 0));
    WiFi.softAP (F("ArClock"));
    dnsServer.start (53, "*", APIP);
    for (int N = 0x200; N >= 0; N -= 3)
    {
      wifi_logo (RgbColor (N > 0x180 ? N - 0x180 : 0, N > 0x180 ? N - 0x180 : 0, N > 0x100 ? 0x80 : (N > 0x80 ? N - 0x80 : 0)));
      delay (15);
    }
    show_message (F("Connect to ArClock WiFi network to setup"));
  }
  

  if (!LittleFS.begin()) {
    Serial.println("LittleFS Mount failed");        // Serious problem with LittleFS 
  } else { 
    Serial.println("LittleFS Mount succesfull");
    loadHistory();
  }
  delay(50);
  /*
  * Start the webserver
  */

  server.serveStatic("/js/bootstrap-table.min.js", LittleFS, "/js/bootstrap-table.min.js");
  server.serveStatic("/js/bootstrap.min.js", LittleFS, "/js/bootstrap.min.js");
  server.serveStatic("/js/loader.js", LittleFS, "/js/loader.js");
  server.serveStatic("/js/jquery.min.js", LittleFS, "/js/jquery.min.js");
  server.serveStatic("/css/bootstrap-table.min.css", LittleFS, "/css/bootstrap-table.min.css");
  server.serveStatic("/css/bootstrap.min.css", LittleFS, "/css/bootstrap.min.css");
  server.serveStatic("/img/logo.png", LittleFS, "/img/logo.png");
  server.onNotFound (handle_default_webpage);
  server.on("/", handle_default_webpage);
  server.on("/tabmeasures.json", sendTabMeasures);
  server.on("/measures.json", sendMeasures);
  server.on("/gpio", updateGpio);
  server.on("/graph_temp.json", sendHistory);

  server.begin();
  Serial.println ( "HTTP server started" );
  /*
   * Apply other settings
   */
  update ();
  
  server.on (F("/update"), handle_update);
  server.on (F("/change"), handle_change);
  server.on (F("/timezones"), handle_timezones);
  server.on (F("/reboot"), handle_reboot);
  server.on (F("/show"), handle_show);
  server.on (F("/load_preset"), handle_load_preset);
  
  //server.on (F("/pure-min.css"), [] { server.send (200, "text/css", pure_min_css); });
  //server.on (F("/grids-responsive-min.css"), [] { server.send (200, "text/css", grids_responsive_min_css); });
  //server.on (F("/script.js"), [] { server.send (200, "text/js", script_js); });

  
  //server.onNotFound (handle_default_webpage);
  //server.begin ();
}

/**************************************************************************/

void loop ()
{
  /*
   * Banner messages take priority
   */
  if (!message ())
  {
    /*
     * Update the effect
     */
    effect (settings.at (F("effect")));
  
    /*
     * Get the temperature
     */
    fetch_weather ();
      
    /*
     * Get the time
     */
    auto now = ::time (nullptr);
    auto tm = ::localtime (&now);
    year = 1900 + tm->tm_year;
    month = tm->tm_mon + 1;
    day = tm->tm_mday;
    hours = tm->tm_hour;
    minutes = tm->tm_min;
    seconds = tm->tm_sec;
    
    /*
     * Display the clocks (suppressed for the first few seconds to allow NTP startup)
     */
    if (now > 5)
    {
      clock (F("primary"));
      clock (F("secondary"));
    }  
  }
  /*
   * Display the data
   */
  strip.Show ();

  /*
   * Handle web server events
   */
  server.handleClient ();
  MDNS.update ();
  dnsServer.processNextRequest ();
}

void updateGpio(){
  String gpio = server.arg("id");
  String etat = server.arg("etat");
  String success = "1";
  int pin = D5;
 if ( gpio == "D5" ) {
      pin = D5;
 } else if ( gpio == "D7" ) {
     pin = D7;
 } else if ( gpio == "D8" ) {
     pin = D8;  
 } else {   
      pin = D5;
  }
  Serial.println(pin);
  if ( etat == "1" ) {
    digitalWrite(pin, HIGH);
  } else if ( etat == "0" ) {
    digitalWrite(pin, LOW);
  } else {
    success = "1";
    Serial.println("Err Led Value");
  }
  
  String json = "{\"gpio\":\"" + String(gpio) + "\",";
  json += "\"etat\":\"" + String(etat) + "\",";
  json += "\"success\":\"" + String(success) + "\"}";
    
  server.send(200, "application/json", json);
  Serial.println("GPIO updated");
}

void sendMeasures() {
  String json = "{\"t\":\"" + String(t) + "\",";
  json += "\"h\":\"" + String(h) + "\",";
  json += "\"pa\":\"" + String(pa) + "\"}";

  server.send(200, "application/json", json);
  Serial.println("Send measures");
}

void calcStat(){
  float statTemp[7] = {-999,-999,-999,-999,-999,-999,-999};
  float statHumi[7] = {-999,-999,-999,-999,-999,-999,-999};
  int nbClass = 7;  // Nombre de classes - Number of classes                         
  int currentClass = 0;
  int sizeClass = hist_t.size() / nbClass;  // 2
  double temp;
  //
  if ( hist_t.size() >= sizeHist ) {
    //Serial.print("taille classe ");Serial.println(sizeClass);
    //Serial.print("taille historique ");Serial.println(hist_t.size());
    for ( int k = 0 ; k < hist_t.size() ; k++ ) {
      temp = root["t"][k];
      if ( statTemp[currentClass] == -999 ) {
        statTemp[ currentClass ] = temp;
      } else {
        statTemp[ currentClass ] = ( statTemp[ currentClass ] + temp ) / 2;
      }
      temp = root["h"][k];
      if ( statHumi[currentClass] == -999 ) {
        statHumi[ currentClass ] = temp;
      } else {
        statHumi[ currentClass ] = ( statHumi[ currentClass ] + temp ) / 2;
      }
         
      if ( ( k + 1 ) > sizeClass * ( currentClass + 1 ) ) {
        //Serial.print("k ");Serial.print(k + 1);Serial.print(" Cellule statTemp = ");Serial.println(statTemp[ currentClass ]);
        currentClass++;
      } else {
        //Serial.print("k ");Serial.print(k + 1);Serial.print(" < ");Serial.println(sizeClass * currentClass);
      }
    }
    
    Serial.println("Histogram - Temperature"); 
    for ( int i = 0 ; i < nbClass ; i++ ) {
      Serial.print(statTemp[i]);Serial.print('|');
    }
    Serial.println("Histogram - Humidity "); 
    for ( int i = 0 ; i < nbClass ; i++ ) {
      Serial.print(statHumi[i]);Serial.print('|');
    }
    Serial.print("");
    if ( bart.size() == 0 ) {
      for ( int k = 0 ; k < nbClass ; k++ ) { 
        bart.add(statTemp[k]);
        barh.add(statHumi[k]);
      }  
    } else {
      for ( int k = 0 ; k < nbClass ; k++ ) { 
        bart[k]=statTemp[k];
        barh[k]=statHumi[k];
      }  
    }
  }
}

void sendTabMeasures() {
  double temp = root["t"][0];      // get oldest record (temperature)
  String json = "[";
  json += "{\"mesure\":\"Température\",\"valeur\":\"" + String(t) + "\",\"unite\":\"°C\",\"glyph\":\"glyphicon-indent-left\",\"precedente\":\"" + String(temp) + "\"},";
  temp = root["h"][0];             // Récupère la plus ancienne mesure (humidite) - get oldest record (humidity)
  json += "{\"mesure\":\"Humidité\",\"valeur\":\"" + String(h) + "\",\"unite\":\"%\",\"glyph\":\"glyphicon-tint\",\"precedente\":\"" + String(temp) + "\"},";
  temp = root["pa"][0];             // Récupère la plus ancienne mesure (pression atmospherique) - get oldest record (Atmospheric Pressure)
  json += "{\"mesure\":\"Pression Atmosphérique\",\"valeur\":\"" + String(pa) + "\",\"unite\":\"mbar\",\"glyph\":\"glyphicon-dashboard\",\"precedente\":\"" + String(temp) + "\"}";
  json += "]";
  server.send(200, "application/json", json);
  Serial.println("Send data tab");
}

void sendHistory(){  
  serializeJson(root, json, sizeof(json));      //Export JSON object as a string
  server.send(200, "application/json", json);   //Send history data to the web client
  Serial.println("Send History");   
}

void loadHistory(){
  File file = LittleFS.open(HISTORY_FILE, "r");
  if (!file){
    Serial.println("No History Data found.");
  } else {
    size_t size = file.size();
    if ( size == 0 ) {
      Serial.println("History file empty !");
    } else {
      std::unique_ptr<char[]> buf (new char[size]);
      file.readBytes(buf.get(), size);
      DeserializationError error = deserializeJson(root,buf.get());
      if (error) {
        Serial.println("Failed to read JSON file");
      } else {
        Serial.println("History loaded");
        serializeJson(root, Serial);  
      }
    }
    file.close();
  }
}

void saveHistory(){
  Serial.println("Save History");            
  File historyFile = LittleFS.open(HISTORY_FILE, "w");
  serializeJson(root, historyFile); // Export and save JSON object to LittleFS area
  historyFile.close();  
}

/**************************************************************************/
