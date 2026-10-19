# ArClock

ArClock is a WiFi-connected LED matrix clock for the ESP8266 (Wemos D1 Mini),
originally created by [Matt Aubury](https://github.com/mattaubury/ArClock).
This repository is a customized fork that extends the original clock firmware
with an enhanced, tabbed web dashboard (configuration, graphs, GPIO control
and weather data) built by [Mike van der Sluis](http://www.mybesttools.com).
For the original hardware build — including the 3D-printed, wood-veneered
enclosure and wiring — see the
[ArClock: a Smart Display Wrapped in Real Wood](https://www.instructables.com/ArClock-a-Smart-Display-Wrapped-in-Real-Wood/)
Instructables guide.

The clock drives a 32x8 addressable LED matrix to show the time, date,
temperature, ping latency and scrolling messages, with a variety of color
modes and ambient effects (rain, snow, pulse, bounce, chase, a ping-latency
graph, and a Christmas-day "snow" easter egg). All settings are configured
through a built-in web server and persisted to flash — no recompiling or
re-flashing is needed to change how the clock looks or behaves.

## Features

- **32x8 RGB LED matrix display** driven via `NeoPixelBus`, with a configurable
  layout (`ArClock/ArClock.cpp`, [clock.h](/Users/mike/source/arclock-/ArClock/clock.h)).
- **Two independent clock lines** ("primary" and "secondary"), each with its
  own position, font, color, color mode and format string (year, month, day,
  12/24-hour time, seconds, temperature, ping latency, etc.) — see
  [clock.h](/Users/mike/source/arclock-/ArClock/clock.h) and
  [clock_fonts.h](/Users/mike/source/arclock-/ArClock/clock_fonts.h).
- **Color modes**: Constant, Varying, Rainbow, Plasma and Random, applied to
  clocks and effects alike ([color.h](/Users/mike/source/arclock-/ArClock/color.h)).
- **Ambient effects**: None, Pulse, Rain, Bounce, Chase and a live Ping Graph,
  plus a hidden snow effect on December 25th
  ([effect.h](/Users/mike/source/arclock-/ArClock/effect.h)).
- **Scrolling messages** with `%Y %y %m %d %H %h %M %S %p %C %F` placeholder
  substitution and an optional repeat interval
  ([message.h](/Users/mike/source/arclock-/ArClock/message.h)).
- **Weather lookup** via the OpenWeatherMap API (current temperature, shown on
  the clock face and in messages) — [weather.h](/Users/mike/source/arclock-/ArClock/weather.h).
- **Network ping monitor** (via the `Pinger` library) that can be shown as a
  live graph or digits on the display.
- **Built-in web server & captive portal**: on first boot (or if the
  configured WiFi network cannot be found) the device starts its own
  `ArClock` access point with a captive portal so you can supply WiFi
  credentials; once connected it is reachable at `http://arclock.local`
  ([ArClock.cpp](/Users/mike/source/arclock-/ArClock/ArClock.cpp),
  [web.h](/Users/mike/source/arclock-/ArClock/web.h)).
- **Tabbed configuration dashboard** (`data/index.html`) with:
  - **Configuration** — WiFi credentials, brightness, presets, timezone,
    OpenWeatherMap location/API key, ping target, per-clock position/font/
    color/format, scrolling message text/color/repeat, effect settings, plus
    a selectable Bootswatch theme.
  - **Graphs** — historical temperature, humidity and pressure charts and a
    histogram, backed by a rolling JSON history persisted to `LittleFS`.
  - **GPIO** — on/off toggle switches for GPIO pins `D5`, `D6`, `D7` and `D8`.
  - **Weather Data** — a live table of the latest temperature, humidity and
    pressure readings compared to the previous reading.
- **Named presets** (Vanilla, Minimalist, Utility, Perpetual, Pride, Ping,
  1990s) that can be applied with one click from the dashboard
  ([settings.h](/Users/mike/source/arclock-/ArClock/settings.h)).
- **Persistent settings** stored as simple `key=value` pairs on the
  filesystem, with sensible defaults baked into the firmware.
- **Timezone database** covering a large list of IANA timezone names, used to
  configure NTP time sync correctly ([timezones.h](/Users/mike/source/arclock-/ArClock/timezones.h)).

> **Note:** the GPIO, Graphs and Weather Data tabs provide the web UI and data
> plumbing (`t`, `h`, `pa` fields and JSON history persisted to
> `/history.json`) for an external temperature/humidity/pressure sensor, but
> this firmware does not yet read from a physical sensor — those values stay
> at `0` until sensor-reading code is added to `ArClock.cpp`.

## Hardware

- **Microcontroller**: Wemos D1 Mini (ESP8266).
- **Display**: 32x8 addressable (NeoPixel/WS2812-style) LED matrix.
- **Enclosure**: a 3D-printed, wood-veneered case. Print files are provided
  as both an editable [OpenSCAD](https://openscad.org/) source
  ([ArClock.scad](/Users/mike/source/arclock-/ArClock.scad)) and ready-to-print
  STLs ([ArclockBase.stl](/Users/mike/source/arclock-/ArclockBase.stl),
  [ArclockBody.stl](/Users/mike/source/arclock-/ArclockBody.stl)). If your
  printer's bed isn't large enough for the curved design (needs a horizontal
  axis of at least 330mm), use the flat alternative in
  [FlatSTLs/](/Users/mike/source/arclock-/FlatSTLs) instead.
- Optional: a temperature/humidity/pressure sensor wired to the board for the
  Graphs/Weather Data tabs (not yet wired up in firmware — see note above).

See the [ArClock: a Smart Display Wrapped in Real Wood](https://www.instructables.com/ArClock-a-Smart-Display-Wrapped-in-Real-Wood/)
Instructables guide for full assembly instructions.

## Repository layout

```
ArClock.scad          OpenSCAD source for the 3D-printed enclosure
ArclockBase.stl        Printable base (curved design)
ArclockBody.stl        Printable body (curved design)
FlatSTLs/              Flat-bed alternative enclosure STLs (for printers
                      without a 330mm+ horizontal axis)
LICENSE                 CC0 1.0 Universal (public domain dedication)
readme.md               This file
ArClock/                Firmware: PlatformIO project for the ESP8266
  ArClock.cpp            Main firmware: setup/loop, WiFi/AP, web routes, GPIO
                        and sensor-history endpoints
  clock.h                Rendering of the clock text onto the LED matrix
  clock_fonts.h          Bitmap fonts available for the clocks (Extra large,
                        Large, Medium, Small, 7-segment)
  color.h                Color mode functions (Constant, Varying, Rainbow,
                        Plasma, Random)
  effect.h               Background/ambient effects drawn onto the matrix
  message.h              Scrolling banner message support
  settings.h             Settings storage, defaults and named presets
  text_font.h            Font used for scrolling messages
  timezones.h            IANA timezone name/offset lookup table used for NTP
  weather.h              OpenWeatherMap client for current temperature
  web.h                  HTTP route handlers and settings <-> web form glue
  wifi_logo.h            Animated WiFi logo shown on the matrix during connect
  page_template.h        Fallback HTML page template embedded in firmware
  data/                  Static web assets served from LittleFS
    index.html             Tabbed configuration/graphs/GPIO/weather dashboard
    css/                   Bootstrap, Bootstrap Table and custom ArClock styles
    js/                    jQuery, Bootstrap, Bootstrap Table and dashboard logic
    img/                   Dashboard logo
  src/main.cpp           Placeholder PlatformIO entry point (unused; see
                        ArClock.cpp)
  platformio.ini          PlatformIO project/build configuration
  arclock.code-workspace  VS Code workspace definition
```

## Getting started

The firmware is a [PlatformIO](https://platformio.org/) project located in
the [ArClock/](/Users/mike/source/arclock-/ArClock) subfolder.

1. Install PlatformIO (e.g. the VS Code extension, or `pip install platformio`).
2. Open the `ArClock/` folder in VS Code (or open
   `ArClock/arclock.code-workspace`), or run PlatformIO from the command line
   from inside `ArClock/`.
3. Connect your Wemos D1 Mini via USB.
4. Build and upload the firmware:
   ```sh
   cd ArClock
   pio run -t upload
   ```
5. Upload the filesystem image (serves `data/` — the web dashboard, settings
   and history file — from `LittleFS`):
   ```sh
   pio run -t uploadfs
   ```
6. Power on the clock. If it can't connect to a known WiFi network, it starts
   its own `ArClock` access point with a captive portal — connect to it and
   follow the prompt to supply your WiFi credentials.
7. Once connected to your network, browse to `http://arclock.local` (or the
   IP address shown on the display) to open the configuration dashboard.

### Configuration

- **WiFi**: SSID/password, applied on save with a reboot.
- **Presets**: pick a named preset to instantly apply a full look (position,
  fonts, colors, effect).
- **Primary/Secondary clock**: position (X/Y), font, color, color mode and
  format string.
- **Effects**: effect type, color, color mode, speed and decay.
- **Messages**: scrolling text with time/weather/ping placeholders and an
  optional repeat interval.
- **Weather**: OpenWeatherMap API key and location string.
- **Timezone**: selected from a searchable list; used to configure NTP.

Settings are stored on-device and persist across reboots and power loss.

## Dependencies

Declared in [platformio.ini](/Users/mike/source/arclock-/ArClock/platformio.ini):

- `makuna/NeoPixelBus` — drives the addressable LED matrix.
- `adafruit/Adafruit GFX Library` — font/glyph rendering for scrolling
  messages.

The firmware also uses the ESP8266 Arduino core libraries (`ESP8266WiFi`,
`ESP8266mDNS`, `ESP8266WebServer`, `DNSServer`, `LittleFS`), plus `Pinger`
(network ping) and `ArduinoJson` (settings/history parsing), which should be
added to `lib_deps` if they are not already resolved by your PlatformIO
environment.

## License

The 3D-print design files ([ArClock.scad](/Users/mike/source/arclock-/ArClock.scad),
the `.stl` files and [FlatSTLs/](/Users/mike/source/arclock-/FlatSTLs)) are
dedicated to the public domain under the
[CC0 1.0 Universal](/Users/mike/source/arclock-/LICENSE) license.

## Credits

- Original ArClock design, firmware and 3D-printed enclosure by
  [Matt Aubury](https://github.com/mattaubury/ArClock), documented in the
  [ArClock: a Smart Display Wrapped in Real Wood](https://www.instructables.com/ArClock-a-Smart-Display-Wrapped-in-Real-Wood/)
  Instructables guide.
- Dashboard UI enhancements (Graphs, GPIO and Weather Data tabs) by
  [Mike van der Sluis](http://www.mybesttools.com).
