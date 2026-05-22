import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View } from 'react-native';

interface PagerViewProps {
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  style?: any;
  children?: React.ReactNode;
}

export interface PagerViewRef {
  setPage: (page: number) => void;
}

export const PagerView = forwardRef<any, PagerViewProps>(
  ({ initialPage = 0, onPageSelected, style, children }, ref) => {
    const [currentPage, setCurrentPage] = useState(initialPage);

    useEffect(() => {
      setCurrentPage(initialPage);
    }, [initialPage]);

    useImperativeHandle(ref, () => ({
      setPage: (page: number) => {
        setCurrentPage(page);
        if (onPageSelected) {
          onPageSelected({ nativeEvent: { position: page } });
        }
      },
    }));

    const childrenArray = React.Children.toArray(children);

    return (
      <View style={[{ flex: 1 }, style]}>
        {childrenArray.map((child, index) => {
          const isActive = index === currentPage;
          return (
            <View
              key={index}
              style={{
                flex: 1,
                display: isActive ? 'flex' : 'none',
              }}
            >
              {child}
            </View>
          );
        })}
      </View>
    );
  }
);

export default PagerView;
