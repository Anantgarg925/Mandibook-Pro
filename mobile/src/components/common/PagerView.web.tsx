import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { ScrollView, View, Dimensions, LayoutChangeEvent } from 'react-native';

const PagerView = forwardRef((props: any, ref) => {
  const { initialPage = 0, onPageSelected, children, style } = props;
  const scrollViewRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const [hasScrolledInit, setHasScrolledInit] = useState(false);
  const currentPage = useRef(initialPage);
  const scrollTimeout = useRef<any>(null);

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

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
      const page = Math.round(offsetX / width);
      if (page !== currentPage.current) {
        currentPage.current = page;
        if (onPageSelected) {
          onPageSelected({ nativeEvent: { position: page } });
        }
      }
    }, 100);
  };

  const onMomentumScrollEnd = (e: any) => {
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    if (page !== currentPage.current) {
      currentPage.current = page;
      if (onPageSelected) {
        onPageSelected({ nativeEvent: { position: page } });
      }
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

  return (
    <View style={[style, { flex: 1, overflow: 'hidden' }]} onLayout={onLayout}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ minWidth: width * numPages, height: '100%' }}
        scrollEnabled={true}
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
