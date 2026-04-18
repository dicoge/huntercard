import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import { usePopularCards } from '../hooks/useHoloSearch';
import CardItem from '../components/CardItem';
import { HoloCard } from '../types/hololive';

// ----------------------------------------
// 首頁畫面
// ----------------------------------------
export default function HomeScreen({ navigation }: any) {
  const { loading, error, cards } = usePopularCards(20);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  const handleCardPress = (card: HoloCard) => {
    navigation.navigate('CardDetail', { card });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌸 HoloHunter</Text>
        <Text style={styles.subtitle}>hololive 卡牌價格查詢工具</Text>
      </View>
      
      <FlatList
        data={cards}
        renderItem={({ item }) => (
          <CardItem 
            card={item} 
            onPress={() => handleCardPress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    marginBottom: 20,
    paddingTop: 8,
  },
  title: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  list: {
    paddingBottom: 20,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
  },
});
