import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSize, fontWeight, radius, spacing } from '@ridefix/ui-tokens';
import { PrimaryButton } from '../components/PrimaryButton';
import { PrototypeMap } from '../components/PrototypeMap';
import { ErrorText, Muted, Screen } from '../components/Screen';
import { BellButton, IconTile, Logo, StatusPill, VehicleIcon } from '../components/parts';
import { formatLkr, useDriverData, vehicleLabel } from '../lib/driver-data';
import type { Bid, RideRequest } from '../lib/request-api';
import { supabase } from '../lib/supabase';
import { ui } from '../theme';
import { RequestHistory, RequestRow } from './RequestHistory';
import {
  describeProblem,
  LocationStep,
  PROBLEMS,
  ProblemStep,
  ReviewStep,
  SERVICES,
  ServiceStep,
  VehicleStep,
  type RequestDraft,
  type ServiceName,
} from './request/NewRequestSteps';
import {
  CompareOffers,
  ConfirmProvider,
  OfferDetail,
  OffersReceived,
} from './request/OfferScreens';
import {
  FindingProviders,
  LiveTracking,
  ProviderConfirmed,
  ServiceCompleted,
  ServiceInProgress,
  type ProviderCardInfo,
} from './request/StatusScreens';

type Route =
  | 'home'
  | 'history'
  | 'service'
  | 'vehicle'
  | 'problem'
  | 'location'
  | 'review'
  | 'status'
  | 'tracking'
  | 'offers'
  | 'compare'
  | 'offerDetail'
  | 'offerConfirm';

const HOME_SERVICES: ServiceName[] = ['Roadside Assistance', 'Book a Garage', 'Towing Service'];

function providerInfo(request: RideRequest, bid: Bid | undefined): ProviderCardInfo {
  if (!bid) {
    return {
      name: 'Your provider',
      detail: request.providerId ? `Provider ${request.providerId.slice(0, 8)}` : undefined,
    };
  }
  return {
    name: bid.providerName,
    etaMinutes: bid.etaMinutes,
    priceLabel: formatLkr(bid.priceLkr),
    detail: formatLkr(bid.priceLkr),
  };
}

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const data = useDriverData();
  const { activeRequest, bids, defaultVehicle, place, requests, user } = data;
  const [stack, setStack] = useState<Route[]>(['home']);
  const [returnToReview, setReturnToReview] = useState(false);
  const [draft, setDraft] = useState<RequestDraft>({
    service: 'Roadside Assistance',
    vehicle: null,
    problem: PROBLEMS[0],
    notes: '',
    place,
  });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [statusRequestId, setStatusRequestId] = useState<string | null>(null);
  const [offer, setOffer] = useState<Bid | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState('');

  const route = stack[stack.length - 1] ?? 'home';
  const push = (next: Route) => setStack((current) => [...current, next]);
  const back = () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  const goHome = () => setStack(['home']);
  const statusRequest = requests.find((item) => item.id === statusRequestId) ?? null;
  const openBids = bids.filter(
    (bid) => bid.requestId === statusRequestId && bid.status === 'Submitted',
  );

  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: route === 'home' ? undefined : { display: 'none' } });
  }, [navigation, route]);

  useEffect(() => {
    if (route === 'home' || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, [route]);

  // Leave the status screens when the request ends or the driver signs out.
  useEffect(() => {
    const onStatusRoute = route === 'status' || route === 'tracking';
    if (!onStatusRoute) return;
    if (!statusRequest || ['Cancelled', 'Expired', 'Disputed'].includes(statusRequest.status)) {
      goHome();
    }
  }, [route, statusRequest]);

  function startRequest(service: ServiceName) {
    if (activeRequest) {
      openStatus(activeRequest);
      return;
    }
    setDraft({
      service,
      vehicle: defaultVehicle,
      problem: PROBLEMS[0],
      notes: '',
      place,
    });
    setReturnToReview(false);
    setSendError('');
    setStack(['home', 'service']);
  }

  function openStatus(request: RideRequest) {
    setStatusRequestId(request.id);
    setStack(['home', 'status']);
  }

  function nextStep(next: Route) {
    if (returnToReview) {
      setReturnToReview(false);
      back();
    } else {
      push(next);
    }
  }

  function update(changes: Partial<RequestDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  async function send() {
    if (!supabase || !user) {
      setSendError('Sign in from Profile before sending a request. Your details stay here.');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      const request = await data.createRequest({
        serviceType: draft.service,
        vehicleDescription: draft.vehicle ? vehicleLabel(draft.vehicle) : null,
        problemDescription: describeProblem(draft),
        place: draft.place,
      });
      openStatus(request);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Could not send your request.');
    } finally {
      setSending(false);
    }
  }

  function viewOffer(bid: Bid) {
    setOffer(bid);
    setOfferError('');
    push('offerDetail');
  }

  async function acceptOffer(bid: Bid) {
    setOfferBusy(true);
    setOfferError('');
    try {
      await data.acceptBid(bid);
      setStack(['home', 'status']);
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Could not accept this offer.');
    } finally {
      setOfferBusy(false);
    }
  }

  async function declineOffer(bid: Bid) {
    setOfferBusy(true);
    setOfferError('');
    try {
      await data.rejectBid(bid);
      back();
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Could not decline this offer.');
    } finally {
      setOfferBusy(false);
    }
  }

  const toNotifications = () => navigation.navigate('Notifications');
  const stepProps = { draft, update, onBack: back };

  switch (route) {
    case 'history':
      return <RequestHistory title="Recent Activity" onBack={back} />;
    case 'service':
      return (
        <ServiceStep
          {...stepProps}
          onNext={() => nextStep('vehicle')}
          onNotifications={toNotifications}
        />
      );
    case 'vehicle':
      return <VehicleStep {...stepProps} onNext={() => nextStep('problem')} />;
    case 'problem':
      return <ProblemStep {...stepProps} onNext={() => nextStep('location')} />;
    case 'location':
      return <LocationStep {...stepProps} onNext={() => nextStep('review')} />;
    case 'review':
      return (
        <ReviewStep
          draft={draft}
          sending={sending}
          error={sendError}
          onBack={back}
          onEdit={(step) => {
            setReturnToReview(true);
            push(step);
          }}
          onSend={() => void send()}
        />
      );
    case 'status':
    case 'tracking': {
      if (!statusRequest) return null;
      const provider = providerInfo(
        statusRequest,
        bids.find((bid) => bid.requestId === statusRequest.id && bid.status === 'Accepted'),
      );
      const { status } = statusRequest;
      if (route === 'status' && status === 'Open for bids') {
        return (
          <FindingProviders
            offerCount={openBids.length}
            onBack={goHome}
            onCancel={() => data.cancelRequest(statusRequest.id)}
            onViewOffers={() => push('offers')}
          />
        );
      }
      if (status === 'Completed') {
        return (
          <ServiceCompleted
            priceLabel={provider.priceLabel}
            completedAt={statusRequest.updatedAt}
            onDone={goHome}
          />
        );
      }
      if (status === 'In progress') {
        return (
          <ServiceInProgress
            provider={provider}
            updatedAt={statusRequest.updatedAt}
            onBack={goHome}
          />
        );
      }
      if (route === 'tracking' || status === 'On the way') {
        return (
          <LiveTracking
            provider={provider}
            status={status === 'On the way' ? 'On the way' : 'Booked'}
            onBack={route === 'tracking' ? back : goHome}
          />
        );
      }
      return (
        <ProviderConfirmed provider={provider} onBack={goHome} onTrack={() => push('tracking')} />
      );
    }
    case 'offers':
      return (
        <OffersReceived
          bids={openBids}
          onBack={back}
          onCompare={() => push('compare')}
          onView={viewOffer}
        />
      );
    case 'compare':
      return <CompareOffers bids={openBids} onBack={back} onSelect={viewOffer} />;
    case 'offerDetail':
      return offer ? (
        <OfferDetail
          bid={offer}
          busy={offerBusy}
          error={offerError}
          onBack={back}
          onAccept={() => {
            setOfferError('');
            push('offerConfirm');
          }}
          onDecline={() => void declineOffer(offer)}
        />
      ) : null;
    case 'offerConfirm':
      return offer ? (
        <ConfirmProvider
          bid={offer}
          busy={offerBusy}
          error={offerError}
          onBack={back}
          onConfirm={() => void acceptOffer(offer)}
        />
      ) : null;
    default:
      break;
  }

  const recent = requests[0] ?? null;

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.brandText}>
          <Logo size={30} />
          <View style={styles.placeRow}>
            <Feather name="map-pin" size={15} color={ui.ink} />
            <Muted>{place.address}</Muted>
          </View>
        </View>
        <BellButton onPress={toNotifications} />
      </View>

      <View style={styles.greeting}>
        <Text accessibilityRole="header" style={styles.greetingTitle}>
          Hi, {data.displayName}!
        </Text>
        <Muted>We’re here when you need us.</Muted>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => startRequest('Roadside Assistance')}
        style={styles.search}
      >
        <Feather name="search" size={18} color={ui.ink} />
        <Text style={styles.searchText}>What do you need help with?</Text>
      </Pressable>

      {activeRequest && (
        <Pressable
          accessibilityRole="button"
          onPress={() => openStatus(activeRequest)}
          style={styles.activeCard}
        >
          <View style={styles.activeTop}>
            <Text style={styles.activeTitle}>Your active request</Text>
            <StatusPill status={activeRequest.status} />
          </View>
          <RequestSummary request={activeRequest} />
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open My Vehicles"
        onPress={() => navigation.navigate('My Vehicles')}
        style={styles.vehicleCard}
      >
        <View style={styles.vehicleText}>
          <Text style={styles.vehicleName}>{defaultVehicle?.name ?? 'Add your vehicle'}</Text>
          <Text style={styles.vehiclePlate}>
            {defaultVehicle?.plate ?? 'Get help faster next time'}
          </Text>
        </View>
        <VehicleIcon kind={defaultVehicle?.kind ?? 'car'} size={70} dark />
        <View style={styles.chevron}>
          <Feather name="chevron-right" size={18} color={ui.ink} />
        </View>
      </Pressable>

      <Text style={styles.section}>Roadside Assistance</Text>
      <View style={styles.services}>
        {HOME_SERVICES.map((name) => {
          const service = SERVICES.find((item) => item.name === name);
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => startRequest(name)}
              style={styles.service}
            >
              {name === 'Towing Service' ? (
                <MaterialCommunityIcons name="tow-truck" size={30} color={ui.orange} />
              ) : (
                <Feather name={service?.icon ?? 'tool'} size={26} color={ui.orange} />
              )}
              <Text style={styles.serviceName}>{name}</Text>
            </Pressable>
          );
        })}
      </View>

      <PrototypeMap height={150} label="You are here" />

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Recent Activity</Text>
        {requests.length > 0 && (
          <Text accessibilityRole="button" onPress={() => push('history')} style={styles.seeAll}>
            See all
          </Text>
        )}
      </View>
      {recent ? (
        <View style={styles.recent}>
          <RequestRow request={recent} />
        </View>
      ) : (
        <Muted>
          {user ? 'No requests yet.' : 'Sign in from Profile to send and track requests.'}
        </Muted>
      )}
      {!!data.refreshError && <ErrorText>{data.refreshError}</ErrorText>}
    </Screen>
  );
}

function RequestSummary({ request }: { request: RideRequest }) {
  return (
    <View style={styles.summary}>
      <IconTile name="truck" size={42} />
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle}>{request.serviceType}</Text>
        <Muted>{request.locationAddress}</Muted>
      </View>
      <Feather name="chevron-right" size={18} color={ui.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandText: { gap: spacing.xs, flex: 1 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: { gap: spacing.xs },
  greetingTitle: { color: ui.ink, fontSize: 28, fontWeight: fontWeight.bold },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: ui.soft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  searchText: { color: ui.muted, fontSize: fontSize.body },
  activeCard: {
    backgroundColor: '#FFF9F5',
    borderWidth: 1.5,
    borderColor: ui.orange,
    borderRadius: radius.lg + 2,
    padding: spacing.lg,
    gap: spacing.md,
  },
  activeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeTitle: { color: ui.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: { color: ui.ink, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  vehicleCard: {
    backgroundColor: ui.dark,
    borderRadius: radius.lg + 2,
    padding: spacing.lg + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  vehicleText: { flex: 1, gap: spacing.xs },
  vehicleName: { color: '#FFFFFF', fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold },
  vehiclePlate: { color: '#D8DAE0', fontSize: fontSize.body - 1 },
  chevron: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { color: ui.ink, fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: ui.muted, fontSize: fontSize.body - 1 },
  services: { flexDirection: 'row', gap: spacing.md },
  service: {
    flex: 1,
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.line,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  serviceName: {
    color: ui.ink,
    fontSize: fontSize.caption + 1,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  recent: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.line,
    padding: spacing.md,
  },
});
