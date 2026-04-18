import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import { HoloCard } from '../types/hololive';
import CardItem from '../components/CardItem';

interface SearchResultsScreenProps {
  route: {
    params: {
      query: string;
      results: {
        cards: HoloCard[];
        totalFound: number;
      };
    };
  };
  navigation: any;
}

export default function SearchResultsScreen({ route, navigation }: SearchResultsScreenProps) {
  const { query, results } = route.params;

  const handleCardPress = (card: HoloCard) => {
    navigation.navigate('CardDetail', { card });
  };

  const renderCard = ({ item }: { item: HoloCard }) => (
    <CardItem 
      card={item} 
      onPress={() => handleCardPress(item)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.queryText}>搜尋：{query}</Text>
        <Text style={styles.resultCount}>
          找到 {results.totalFound} 張卡牌
        </Text>
      </View>
      {results.totalFound === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>找不到符合的卡牌</Text>
          <Text style={styles.emptySubtext}>試試看其他關鍵字或卡號</Text>
        </View>
      ) : (
        <FlatList
          data={results.cards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  queryText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultCount: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  list: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
