// Entrada do app: o Expo Router, mais a tarefa que desenha o widget do Android (roda em segundo plano,
// sem a interface do app). No iOS o registro não faz nada.
import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/features/widgets/widgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);
