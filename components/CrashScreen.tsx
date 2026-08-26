import { Component, ReactNode } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

/**
 * Ловит любые ошибки рендера React-дерева и показывает текст ошибки + стек
 * прямо на экране — в том числе в релизной сборке (где стандартный red box
 * от React Native отключён, и без этого приложение просто тихо падает).
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

export class CrashScreen extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ info: info.componentStack });
    console.error("CrashScreen caught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Приложение упало (render error)</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          {this.state.error.stack && <Text style={styles.stack}>{this.state.error.stack}</Text>}
          {this.state.info && (
            <>
              <Text style={styles.title}>Component stack:</Text>
              <Text style={styles.stack}>{this.state.info}</Text>
            </>
          )}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a0000" },
  content: { padding: 20, paddingTop: 60 },
  title: { color: "#FF6B6B", fontSize: 16, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  message: { color: "#FFFFFF", fontSize: 14, marginBottom: 12 },
  stack: { color: "#B0B0B8", fontSize: 11, fontFamily: "monospace" },
});
