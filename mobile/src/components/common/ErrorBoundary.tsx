import React, { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';

type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View
          testID="error-boundary"
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.background,
            padding: Spacing.xl,
          }}
        >
          <Text style={{ fontSize: 56, marginBottom: Spacing.md }}>😵</Text>
          <Text
            style={{
              fontSize: FontSize.xl,
              fontWeight: '900',
              color: Colors.text,
              textAlign: 'center',
              marginBottom: Spacing.sm,
            }}
          >
            कुछ गड़बड़ हो गई
          </Text>
          <Text
            style={{
              fontSize: FontSize.sm,
              color: Colors.textSecond,
              textAlign: 'center',
              marginBottom: Spacing.xl,
            }}
          >
            Something went wrong. Please try again.
          </Text>
          <Pressable
            testID="error-boundary-reset"
            onPress={this.reset}
            style={({ pressed }) => ({
              paddingVertical: Spacing.sm,
              paddingHorizontal: Spacing.xl,
              borderRadius: Radius.round,
              backgroundColor: pressed ? '#E55A00' : Colors.primary,
            })}
          >
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: '#FFF' }}>
              Restart
            </Text>
          </Pressable>
          {this.state.error ? (
            <Text
              style={{
                fontSize: 10,
                color: Colors.border,
                marginTop: Spacing.xl,
                textAlign: 'center',
              }}
            >
              {this.state.error.message}
            </Text>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}
