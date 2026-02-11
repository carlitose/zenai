import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { MeditationCard } from '../components/MeditationCard';
import { useMeditationHistory } from '../hooks/useMeditationHistory';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { Meditation } from '../../domain/entities/Meditation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { meditations, isLoading, refresh, deleteMeditation } = useMeditationHistory();

  const handlePress = (meditation: Meditation) => {
    navigation.navigate('Player', { meditation });
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="leaf-outline" size={64} color={colors.primaryMuted} />
      <Text style={styles.emptyTitle}>Your journey begins here</Text>
      <Text style={styles.emptySubtitle}>
        Create your first meditation to see it appear in your library.
      </Text>
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => {
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate('Create');
          }
        }}
      >
        <Ionicons name="leaf" size={16} color={colors.textOnPrimary} style={{ marginRight: spacing.sm }} />
        <Text style={styles.ctaText}>Create Meditation</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Your Meditations</Text>
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
  header: {
    ...typography.displaySmall,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.displaySmall,
    color: colors.textSecondary,
    marginTop: spacing.xl,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  ctaText: {
    ...typography.labelLarge,
    color: colors.textOnPrimary,
  },
});
