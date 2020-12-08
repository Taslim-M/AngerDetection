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

FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  setupNotifs();
  runApp(MyApp());
}

void setupNotifs() async {
  print("setup!");
// initialise the plugin. app_icon needs to be a added as a drawable resource to the Android head project
  const AndroidInitializationSettings initializationSettingsAndroid = AndroidInitializationSettings('app_notf_icon');
  final IOSInitializationSettings initializationSettingsIOS = IOSInitializationSettings(onDidReceiveLocalNotification: onDidReceiveLocalNotification);
  final MacOSInitializationSettings initializationSettingsMacOS = MacOSInitializationSettings();
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
      theme: ThemeData(
        // This is the theme of your application.
        //
        // Try running your application with "flutter run". You'll see the
        // application has a blue toolbar. Then, without quitting the app, try
        // changing the primarySwatch below to Colors.green and then invoke
        // "hot reload" (press "r" in the console where you ran "flutter run",
        // or simply save your changes to "hot reload" in a Flutter IDE).
        // Notice that the counter didn't reset back to zero; the application
        // is not restarted.
        primarySwatch: Colors.blue,
        // This makes the visual density adapt to the platform that you run
        // the app on. For desktop platforms, the controls will be smaller and
        // closer together (more dense) than on mobile platforms.
        visualDensity: VisualDensity.adaptivePlatformDensity,
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

  void _onMQTTMessage(String topic, String payload)  async {
    print('rcvd Message'+topic+':'+payload);
    var _get_result = jsonDecode(payload);

    if (_get_result['incident_type']=="Anger" && !isAngerDetectionEnabled){
      //skip
    }
    else if (_get_result['incident_type']=="Position" && !isMotionDetectionEnabled) {
      //skip
    }
    else {
      var ntfTitle = _get_result['incident_type'];
      var dev = _get_result['device_id'];
      var ntfBody = "Alert! "+_get_result['incident_type'] + " detection on device $dev";
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
    });
    print("changed Alexa!");
    var valueToPublish = "not_allow";
    if (newValue){
      valueToPublish = "allow";
    }
    cl.publish("configure/alexa", valueToPublish, null);
  }


  void _getCurrentConfigs() async {
    print("Getting current configs");
    http.Response response = await http.get('http://10.0.2.2:3000/get_flutter_configs');
    print(response.statusCode);
    var _get_result = jsonDecode(response.body);
    print(_get_result);
    setState(() {
      isMotionDetectionEnabled = _get_result['detectingMotion'];
      isAlexaEnabled = _get_result['alexaAllowed'];
      isAngerDetectionEnabled = _get_result['detectingAnger'];
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
        title: Center(child: Text(widget.title)),
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
            Card(
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        children: [
                          Icon(Icons.sentiment_very_dissatisfied_outlined),
                        ],
                      ),
                      Column(
                        children: [Text("Anger Detection Enabled",style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),)],
                      ),
                      Column(
                        children: [
                          Switch(
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
                        Icon(Icons.vibration_outlined),
                      ],
                    ),
                    Column(
                      children: [Text("Tampering Detection Enabled",style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),)],
                    ),
                    Column(
                      children: [
                        Switch(
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
                        Icon(Icons.record_voice_over_outlined),
                      ],
                    ),
                    Column(
                      children: [Text("Alexa Enabled",style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),)],
                    ),
                    Column(
                      children: [
                        Switch(
                          value: isAlexaEnabled,
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