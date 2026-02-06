import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { MeditationCard } from '../components/MeditationCard';
import { useMeditationHistory } from '../hooks/useMeditationHistory';
import { RootStackParamList } from '../navigation/types';
import { Meditation } from '../../domain/entities/Meditation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const { meditations, isLoading, refresh, deleteMeditation } = useMeditationHistory();

  const handlePress = (meditation: Meditation) => {
    navigation.navigate('Player', { meditation });
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="leaf-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>No meditations yet</Text>
      <Text style={styles.emptySubtitle}>
        Generate your first meditation from the Home tab.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={meditations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MeditationCard
            meditation={item}
            onPress={() => handlePress(item)}
            onDelete={() => deleteMeditation(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          meditations.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.accent}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
