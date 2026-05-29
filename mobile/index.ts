import { Platform, LogBox } from "react-native";
if (Platform.OS !== "web") {
  require("react-native-get-random-values");
  require("react-native-reanimated");
}
import "expo-router/entry";
LogBox.ignoreLogs(["Expo AV has been deprecated", "Disconnected from Metro"]);
