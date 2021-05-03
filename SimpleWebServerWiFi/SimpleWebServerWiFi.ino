#include "Air_Quality_Sensor.h"

#include <SPI.h>
#include <WiFiNINA.h>

#include <DHT.h>
#include <DHT_U.h>

#define DHTPIN 0
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
AirQualitySensor sensor(A2);

#include "arduino_secrets.h"

IPAddress ip(192, 168, 137, 200);
char ssid[] = SECRET_SSID;
char pass[] = SECRET_PASS;
int keyIndex = 0;
int current_quality =-1;

int status = WL_IDLE_STATUS;
WiFiServer server(80);

void setup() {
  Serial.begin(9600);

  dht.begin();    
  
  if (sensor.init()) {
    Serial.println("Sensor ready.");
  } else {
    Serial.println("Sensor ERROR!");
  }
  
  if (WiFi.status() == WL_NO_MODULE) {
    Serial.println("Communication with WiFi module failed!");
    while (true);
  }

  WiFi.config(ip);
  
  while (status != WL_CONNECTED) {
    Serial.print("Attempting to connect to Network named: ");
    Serial.println(ssid);
    status = WiFi.begin(ssid, pass);
    delay(10000);
  }
  server.begin();
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}


void loop() {
  WiFiClient client = server.available();

  if (client)
  {
    String currentLine = "";
    int resval = analogRead(A1);
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    int quality = sensor.slope();
  
    if (isnan(h) || isnan(t)) {
      Serial.println(F("Failed to read from DHT sensor!"));
      return;
    }
    
    float hic = dht.computeHeatIndex(t, h, false);
  
    Serial.print(F("Humidity: "));
    Serial.print(h);
    Serial.print(F("%  Temperature: "));
    Serial.print(t);
    Serial.print(F("°C "));
    Serial.print(hic);
    Serial.print(F("°C "));

    while (client.connected()) {            // loop while the client's connected
      if (client.available()) {             // if there's bytes to read from the client,
        char c = client.read();             // read a byte, then
        Serial.write(c);                    // print it out the serial monitor
        if (c == '\n')
        {
          if (currentLine.length() == 0) {
            // HTTP headers always start with a response code (e.g. HTTP/1.1 200 OK)
            // and a content-type so the client knows what's coming, then a blank line:
            client.println("HTTP/1.1 200 OK");
            client.println("Content-type:text/html");
            client.println();
            String requestBody = "{\"Water Level\": " + String(resval) + ",\"Humidity\": " + String(h) + ",\"Temperature\": " + String(t) + ",\"Heat Index\": " + String(hic) + ",\"Air Quality Slope\": " + String(quality) + ",\"Air Quality\": " + String(sensor.getValue()) + " }";
            Serial.println(requestBody);
            client.print(requestBody);
            client.println();
            break;
          } 
          else
          {    // if you got a newline, then clear currentLine:
            currentLine = "";
          }
        } 
        else if (c != '\r')
        {
          currentLine += c;
        }
      }
    }
    
    client.stop();
    Serial.println("client disconnected");
  }
}
