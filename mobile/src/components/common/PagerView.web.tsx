import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Dimensions, LayoutChangeEvent, PanResponder, Animated } from 'react-native';

const PagerView = forwardRef((props: any, ref) => {
  const { initialPage = 0, onPageSelected, children, style } = props;
  const scrollViewRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const [hasScrolledInit, setHasScrolledInit] = useState(false);
  const currentPage = useRef(initialPage);

  useImperativeHandle(ref, () => ({
    setPage: (page: number) => {
      currentPage.current = page;
      scrollViewRef.current?.scrollTo({ x: page * width, animated: true });
    },
    setPageWithoutAnimation: (page: number) => {
      currentPage.current = page;
      scrollViewRef.current?.scrollTo({ x: page * width, animated: false });
    }
  }));

  const onMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    currentPage.current = page;
    if (onPageSelected) {
      onPageSelected({ nativeEvent: { position: page } });
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const newWidth = e.nativeEvent.layout.width;
    setWidth(newWidth);
  };

  useEffect(() => {
    if (width > 0 && !hasScrolledInit && initialPage > 0) {
      scrollViewRef.current?.scrollTo({ x: initialPage * width, animated: false });
      setHasScrolledInit(true);
    }
  }, [width, hasScrolledInit, initialPage]);

  const childrenArray = React.Children.toArray(children);
  const numPages = childrenArray.length;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50 && currentPage.current > 0) {
          // Swipe Right (Go to previous page)
          const newPage = currentPage.current - 1;
          currentPage.current = newPage;
          scrollViewRef.current?.scrollTo({ x: newPage * width, animated: true });
          if (onPageSelected) onPageSelected({ nativeEvent: { position: newPage } });
        } else if (gestureState.dx < -50 && currentPage.current < numPages - 1) {
          // Swipe Left (Go to next page)
          const newPage = currentPage.current + 1;
          currentPage.current = newPage;
          scrollViewRef.current?.scrollTo({ x: newPage * width, animated: true });
          if (onPageSelected) onPageSelected({ nativeEvent: { position: newPage } });
        }
      },
    })
  ).current;

  return (
    <View style={[style, { flex: 1, overflow: 'hidden' }]} onLayout={onLayout} {...panResponder.panHandlers}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ minWidth: width * numPages, height: '100%' }}
        scrollEnabled={false} // Disable native scroll so PanResponder takes full control for mouse/touch
      >
        {childrenArray.map((child, index) => (
          <View key={index} style={{ width, height: '100%' }}>
            {child}
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

export default PagerView;
