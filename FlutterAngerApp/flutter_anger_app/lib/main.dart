import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:fluttertoast/fluttertoast.dart';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';
import 'mqtt.dart';

FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  setupNotifs();
  runApp(MyApp());
}

void setupNotifs() async {
  print("setup!");
// initialise the plugin. app_icon needs to be a added as a drawable resource to the Android head project
  const AndroidInitializationSettings initializationSettingsAndroid =
      AndroidInitializationSettings('app_notf_icon');
  final IOSInitializationSettings initializationSettingsIOS =
      IOSInitializationSettings(
          onDidReceiveLocalNotification: onDidReceiveLocalNotification);
  final MacOSInitializationSettings initializationSettingsMacOS =
      MacOSInitializationSettings();
  final InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
      macOS: initializationSettingsMacOS);
  await flutterLocalNotificationsPlugin.initialize(initializationSettings);
}

class MyApp extends StatelessWidget {
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData.dark().copyWith(
        accentColor: Colors.amber,
      ),
      home: MyHomePage(title: 'Anger Detector Configuration'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({Key key, this.title}) : super(key: key);

  final String title;

  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;
  bool isAngerDetectionEnabled = true;
  bool isMotionDetectionEnabled = true;
  bool isAlexaEnabled = true;
  Color angerColor = Colors.orangeAccent;
  Color motionColor = Colors.orangeAccent;
  Color alexaColor = Colors.orangeAccent;
  String alexaText = "Disabled";
  String angerText = "Disabled";
  String motionText = "Disabled";
  List<bool> isSelected = [true, true, true];

  MQTTClient cl;

  void initState() {
    super.initState();
    // initialize MQTT
    _getCurrentConfigs();
    setUpMQTT();
  }

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  void setUpMQTT() async {
    // create an MQTT client.
    cl = new MQTTClient('10.0.2.2', '9001', _onMQTTMessage);
    await cl.connect();
    cl.subscribe('incidents/#', null);
  }

  void _onMQTTMessage(String topic, String payload) async {
    print('rcvd Message' + topic + ':' + payload);
    var _get_result = jsonDecode(payload);

    if (_get_result['incident_type'] == "Anger" && !isAngerDetectionEnabled) {
      //skip
    } else if (_get_result['incident_type'] == "Position" &&
        !isMotionDetectionEnabled) {
      //skip
    } else {
      var ntfTitle = _get_result['incident_type'];
      var dev = _get_result['device_id'];
      var ntfBody = "Alert! " +
          _get_result['incident_type'] +
          " detection on device $dev";
      const AndroidNotificationDetails androidPlatformChannelSpecifics =
          AndroidNotificationDetails(
              '1', 'your channel name', 'your channel description',
              importance: Importance.max,
              priority: Priority.high,
              showWhen: false);
      const NotificationDetails platformChannelSpecifics =
          NotificationDetails(android: androidPlatformChannelSpecifics);
      await flutterLocalNotificationsPlugin.show(
          0, ntfTitle, ntfBody, platformChannelSpecifics,
          payload: 'item x');
    }
  }

  void _setAngerDetectionMode(bool newValue) async {
    setState(() {
      isAngerDetectionEnabled = newValue;
      if (isAngerDetectionEnabled) {
        angerColor = Colors.greenAccent;
        angerText = "Enabled";
      }
      else {
        angerColor = Colors.orangeAccent;
        angerText = "Disabled";
      }
    });
    print("changed Anger!");
    http.Response response = await http.post(
      'http://10.0.2.2:3000/flutter_disable_anger',
      headers: <String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonEncode(<String, bool>{
        'detectingAnger': newValue,
      }),
    );
    print(response.statusCode);
  }

  void _setMotionDetectionMode(bool newValue) async {
    setState(() {
      isMotionDetectionEnabled = newValue;
      if (isMotionDetectionEnabled){
        motionText="Enabled";
        motionColor = Colors.greenAccent;
      }
      else{
        motionText="Disabled";
        motionColor = Colors.orangeAccent;
      }

    });
    print("changed Motion!");
    http.Response response = await http.post(
      'http://10.0.2.2:3000/flutter_disable_motion',
      headers: <String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonEncode(<String, bool>{
        'detectingMotion': newValue,
      }),
    );
    print(response.statusCode);
  }

  void _setAlexaMode(bool newValue) async {
    setState(() {
      isAlexaEnabled = newValue;
      if (isAlexaEnabled) {
        alexaColor = Colors.greenAccent;
        alexaText = "Enabled";
      } else {
        alexaText = "Disabled";
        alexaColor = Colors.orangeAccent;
      }
    });
    print("changed Alexa!");
    var valueToPublish = "not_allow";
    if (newValue) {
      valueToPublish = "allow";
    }
    cl.publish("configure/alexa", valueToPublish, null);
  }

  void _getCurrentConfigs() async {
    print("Getting current configs");
    http.Response response =
        await http.get('http://10.0.2.2:3000/get_flutter_configs');
    print(response.statusCode);
    var _get_result = jsonDecode(response.body);
    print(_get_result);
    setState(() {
      isMotionDetectionEnabled = _get_result['detectingMotion'];
      if (isMotionDetectionEnabled) {
        motionText="Enabled";
        motionColor = Colors.greenAccent;
      }
      isAlexaEnabled = _get_result['alexaAllowed'];
      if (isAlexaEnabled) {
        alexaColor = Colors.greenAccent;
        alexaText = "Enabled";
      }
      isAngerDetectionEnabled = _get_result['detectingAnger'];
      if (isAngerDetectionEnabled) {
        angerText = "Enabled";
        angerColor = Colors.greenAccent;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // This method is rerun every time setState is called, for instance as done
    // by the _incrementCounter method above.
    //
    // The Flutter framework has been optimized to make rerunning build methods
    // fast, so that you can just rebuild anything that needs updating rather
    // than having to individually change instances of widgets.
    return Scaffold(
      appBar: AppBar(
        // Here we take the value from the MyHomePage object that was created by
        // the App.build method, and use it to set our appbar title.
        title: Center(
            child: Text(
          widget.title,
          style:
              TextStyle(fontWeight: FontWeight.bold, color: Colors.cyanAccent),
        )),
      ),
      body: Center(
        // Center is a layout widget. It takes a single child and positions it
        // in the middle of the parent.
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          children: <Widget>[
            Flexible(
              child: FractionallySizedBox(
                widthFactor: 1,
                heightFactor: 0.7,
                child: FittedBox(
                  fit: BoxFit.cover,
                  child: Image.network(
                      'https://image.freepik.com/free-vector/setup-concept-illustration_114360-382.jpg'),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Text(
                "Your last settings are automatically restored.",
                style: TextStyle(
                    fontStyle: FontStyle.italic,
                    color: Colors.lightGreenAccent),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      children: [
                        Icon(Icons.sentiment_very_dissatisfied_outlined,
                            color: angerColor),
                      ],
                    ),
                    Column(
                      children: [
                        Text(
                          "Anger Detection",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      ],
                    ),
                    Column(
                      children: [
                        Text(
                          angerText,
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: angerColor),
                        )
                      ],
                    ),
                    Column(
                      children: [
                        Switch(
                          inactiveThumbColor: Colors.orangeAccent,
                          value: isAngerDetectionEnabled,
                          onChanged: _setAngerDetectionMode,
                        )
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      children: [
                        Icon(Icons.vibration_outlined, color: motionColor),
                      ],
                    ),
                    Column(
                      children: [
                        Text(
                          "Tampering Detection",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      ],
                    ),
                    Column(
                      children: [
                        Text(
                          motionText,
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: motionColor),
                        )
                      ],
                    ),
                    Column(
                      children: [
                        Switch(
                          inactiveThumbColor: Colors.orangeAccent,
                          value: isMotionDetectionEnabled,
                          onChanged: _setMotionDetectionMode,
                        )
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      children: [
                        Icon(
                          Icons.record_voice_over_outlined,
                          color: alexaColor,
                        ),
                      ],
                    ),
                    Column(
                      children: [
                        Text(
                          "Alexa EchoDot",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      ],
                    ),
                    Column(
                      children: [
                        Text(
                          alexaText,
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: alexaColor),
                        )
                      ],
                    ),
                    Column(
                      children: [
                        Switch(
                          value: isAlexaEnabled,
                          inactiveThumbColor: Colors.orangeAccent,
                          onChanged: _setAlexaMode,
                        )
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      // This trailing comma makes auto-formatting nicer for build methods.
    );
  }
}

Future onDidReceiveLocalNotification(
    int id, String title, String body, String payload) async {
  // display a dialog with the notification details, tap ok to go to another page
}

_requestIOSPermission() {
  flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>()
      .requestPermissions(
        alert: false,
        badge: true,
        sound: true,
      );
}
