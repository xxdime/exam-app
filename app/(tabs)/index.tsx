import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
    TextInput, Modal, SafeAreaView, Linking, Alert, KeyboardAvoidingView, Platform, ListRenderItem, ScrollView
} from 'react-native';
import MapView, { Marker, Callout, LongPressEvent, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- ТИПЫ ДАННЫХ ---
interface Coordinate {
    latitude: number;
    longitude: number;
}

interface Place {
    id: string;
    title: string;
    description: string;
    website: string;
    image: string | null;
    coordinate: Coordinate;
}

const STORAGE_KEY = '@user_places_v1';
const COLORS = {
    red: '#D32F2F',
    blue: '#1976D2',
    green: '#388E3C',
    white: '#FFFFFF',
    bg: '#F5F5F5',
    text: '#333333',
    grey: '#808080'
};

const INITIAL_PLACES: Place[] = [
    {
        id: '1',
        title: 'Онежская набережная',
        description: 'Центральное место отдыха в Петрозаводске. Здесь расположены знаменитые скульптуры — подарки от городов-побратимов со всего мира. Идеально подходит для прогулок в любое время года.',
        website: 'https://wiki-karelia.ru',
        image: null,
        coordinate: { latitude: 61.7905, longitude: 34.3900 }
    },
{
    id: '2',
    title: 'Национальный музей',
    description: 'Один из старейших музеев Северо-Запада России. Экспозиции рассказывают о природе, археологии и истории Карелии.',
    website: 'http://nmrk.karelia.ru/',
    image: null,
    coordinate: { latitude: 61.7850, longitude: 34.3600 }
}
];

const DEFAULT_REGION = {
    latitude: 61.7846, longitude: 34.3469,
    latitudeDelta: 0.06, longitudeDelta: 0.06,
};

export default function App() {
    const [currentView, setCurrentView] = useState<'map' | 'list'>('map');
    const [places, setPlaces] = useState<Place[]>([]);
    const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
    const [mapKey, setMapKey] = useState(0);

    // Состояния для модалок
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

    // Форма добавления
    const [newPlaceTitle, setNewPlaceTitle] = useState('');
    const [newPlaceDesc, setNewPlaceDesc] = useState('');
    const [newPlaceWeb, setNewPlaceWeb] = useState('');
    const [newPlaceImage, setNewPlaceImage] = useState<string | null>(null);
    const [tempCoord, setTempCoord] = useState<Coordinate | null>(null);

    useEffect(() => { loadPlaces(); }, []);

    const loadPlaces = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) setPlaces(JSON.parse(stored));
            else { setPlaces(INITIAL_PLACES); savePlaces(INITIAL_PLACES); }
        } catch (e) { console.error(e); }
    };

    const savePlaces = async (data: Place[]) => {
        try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (e) { console.error(e); }
    };

    const handleLongPress = (e: LongPressEvent) => {
        setTempCoord(e.nativeEvent.coordinate);
        setAddModalVisible(true);
    };

    const saveNewPlace = () => {
        if (!newPlaceTitle || !tempCoord) { Alert.alert('Ошибка', 'Введите название'); return; }
        const place: Place = {
            id: Date.now().toString(),
            title: newPlaceTitle,
            description: newPlaceDesc,
            website: newPlaceWeb,
            image: newPlaceImage,
            coordinate: tempCoord
        };
        const updated = [...places, place];
        setPlaces(updated);
        savePlaces(updated);
        setAddModalVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setNewPlaceTitle(''); setNewPlaceDesc(''); setNewPlaceWeb('');
        setNewPlaceImage(null); setTempCoord(null);
    };

    const deletePlace = (id: string) => {
        Alert.alert("Удаление", "Удалить это место?", [
            { text: "Отмена", style: "cancel" },
            { text: "Удалить", style: "destructive", onPress: () => {
                const updated = places.filter(p => p.id !== id);
                setPlaces(updated);
                savePlaces(updated);
                setViewModalVisible(false);
            }}
        ]);
    };

    const goToPlaceOnMap = (place: Place) => {
        setMapRegion({
            latitude: place.coordinate.latitude,
            longitude: place.coordinate.longitude,
            latitudeDelta: 0.01, longitudeDelta: 0.01,
        });
        setMapKey(v => v + 1);
        setCurrentView('map');
        setViewModalVisible(false);
    };

    const openViewModal = (place: Place) => {
        setSelectedPlace(place);
        setViewModalVisible(true);
    };

    const pickImage = async () => {
        let res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [4, 3], quality: 0.5,
        });
        if (!res.canceled) setNewPlaceImage(res.assets[0].uri);
    };

        const renderListItem: ListRenderItem<Place> = ({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openViewModal(item)}>
            <View style={styles.cardImageContainer}>
            {item.image ? (
                <Image source={{ uri: item.image }} style={styles.cardImage} />
            ) : (
                <View style={styles.cardPlaceholder}><Ionicons name="image" size={30} color="#ccc" /></View>
            )}
            </View>
            <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description || 'Нет описания'}</Text>
            <View style={styles.cardFooter}>
            <TouchableOpacity onPress={() => goToPlaceOnMap(item)}>
            <Ionicons name="location" size={20} color={COLORS.blue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deletePlace(item.id)}>
            <Ionicons name="trash" size={20} color={COLORS.red} />
            </TouchableOpacity>
            </View>
            </View>
            </TouchableOpacity>
        );

        return (
            <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>Петрозаводск Гид</Text></View>

            <View style={{ flex: 1 }}>
            {currentView === 'map' ? (
                <View style={{ flex: 1 }}>
                <MapView
                key={mapKey}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                initialRegion={mapRegion}
                onLongPress={handleLongPress}
                >
                {places.map(p => (
                    <Marker
                    key={p.id}
                    coordinate={p.coordinate}
                    title={Platform.OS === 'android' ? p.title : undefined}
                    onCalloutPress={() => openViewModal(p)}
                    >
                    {Platform.OS === 'ios' && (
                        <Callout><View style={styles.iosCallout}><Text style={{fontWeight:'bold'}}>{p.title}</Text></View></Callout>
                    )}
                    </Marker>
                ))}
                </MapView>
                <View style={styles.hint}><Text style={styles.hintText}>Долгое нажатие — добавить место</Text></View>
                </View>
            ) : (
                <FlatList data={places} renderItem={renderListItem} keyExtractor={p => p.id} numColumns={2} contentContainerStyle={{padding: 10}} />
            )}
            </View>

            {/* ТАБ-БАР */}
            <View style={styles.tabBar}>
            <TouchableOpacity style={[styles.tab, currentView === 'map' && styles.activeTab]} onPress={() => setCurrentView('map')}>
            <Ionicons name="map" size={22} color={currentView === 'map' ? 'white' : 'black'} /><Text style={{fontSize:10, color: currentView === 'map' ? 'white' : 'black'}}>Карта</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, currentView === 'list' && styles.activeTab]} onPress={() => setCurrentView('list')}>
            <Ionicons name="list" size={22} color={currentView === 'list' ? 'white' : 'black'} /><Text style={{fontSize:10, color: currentView === 'list' ? 'white' : 'black'}}>Список</Text>
            </TouchableOpacity>
            </View>

            {/* МОДАЛКА: ПРОСМОТР ИНФОРМАЦИИ */}
            <Modal visible={viewModalVisible} animationType="fade" transparent={true}>
            <View style={styles.viewModalOverlay}>
            <View style={styles.viewModalContent}>
            <ScrollView bounces={false}>
            {selectedPlace?.image ? (
                <Image source={{ uri: selectedPlace.image }} style={styles.detailImage} />
            ) : (
                <View style={[styles.detailImage, styles.cardPlaceholder]}><Ionicons name="image" size={60} color="#ccc" /></View>
            )}
            <View style={{ padding: 20 }}>
            <Text style={styles.detailTitle}>{selectedPlace?.title}</Text>
            <Text style={styles.detailDesc}>{selectedPlace?.description || 'Описание отсутствует'}</Text>

            {selectedPlace?.website ? (
                <TouchableOpacity style={styles.detailLink} onPress={() => Linking.openURL(selectedPlace.website)}>
                <Ionicons name="globe-outline" size={20} color={COLORS.blue} />
                <Text style={styles.detailLinkText}>Перейти на сайт</Text>
                </TouchableOpacity>
            ) : null}

            <View style={styles.detailActions}>
            <TouchableOpacity style={[styles.detailBtn, {backgroundColor: COLORS.blue}]} onPress={() => selectedPlace && goToPlaceOnMap(selectedPlace)}>
            <Text style={styles.btnText}>Показать на карте</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.detailBtn, {backgroundColor: COLORS.red}]} onPress={() => selectedPlace && deletePlace(selectedPlace.id)}>
            <Text style={styles.btnText}>Удалить</Text>
            </TouchableOpacity>
            </View>
            </View>
            </ScrollView>
            <TouchableOpacity style={styles.closeCircle} onPress={() => setViewModalVisible(false)}>
            <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            </View>
            </View>
            </Modal>

            {/* МОДАЛКА: ДОБАВЛЕНИЕ (УПРОЩЕНО) */}
            <Modal visible={addModalVisible} animationType="slide" transparent={true}>
            <KeyboardAvoidingView behavior="padding" style={styles.viewModalOverlay}>
            <View style={[styles.viewModalContent, {padding: 20, maxHeight: '80%'}]}>
            <Text style={styles.modalTitle}>Новое место</Text>
            <TextInput style={styles.input} placeholder="Название" onChangeText={setNewPlaceTitle} />
            <TextInput style={[styles.input, {height: 80}]} placeholder="Описание" multiline onChangeText={setNewPlaceDesc} />
            <TextInput style={styles.input} placeholder="Ссылка (http://...)" onChangeText={setNewPlaceWeb} />
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <Text style={{color: 'white'}}>{newPlaceImage ? 'Фото выбрано' : 'Выбрать фото'}</Text>
            </TouchableOpacity>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <TouchableOpacity style={[styles.detailBtn, {width: '48%', backgroundColor: '#999'}]} onPress={() => setAddModalVisible(false)}><Text style={styles.btnText}>Отмена</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.detailBtn, {width: '48%', backgroundColor: COLORS.green}]} onPress={saveNewPlace}><Text style={styles.btnText}>ОК</Text></TouchableOpacity>
            </View>
            </View>
            </KeyboardAvoidingView>
            </Modal>
            </SafeAreaView>
        );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { padding: 15, paddingTop: 50, backgroundColor: 'white', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    map: { flex: 1 },
    tabBar: { flexDirection: 'row', height: 60, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee' },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    activeTab: { backgroundColor: COLORS.red },
    hint: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: 'white', padding: 8, borderRadius: 20, elevation: 3 },
    hintText: { fontSize: 12 },

    // Список
    card: { flex: 1, margin: 5, backgroundColor: 'white', borderRadius: 12, height: 200, overflow: 'hidden', elevation: 2 },
    cardImageContainer: { height: 100, backgroundColor: '#f0f0f0' },
    cardImage: { width: '100%', height: '100%' },
    cardPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cardContent: { padding: 8, flex: 1, justifyContent: 'space-between' },
    cardTitle: { fontWeight: 'bold', fontSize: 14 },
    cardDesc: { fontSize: 11, color: '#666' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 4 },

    // Модалка просмотра (Fullscreen-like)
    viewModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    viewModalContent: { width: '90%', maxHeight: '85%', backgroundColor: 'white', borderRadius: 20, overflow: 'hidden' },
    detailImage: { width: '100%', height: 200 },
    detailTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    detailDesc: { fontSize: 15, color: '#444', lineHeight: 22 },
    detailLink: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
    detailLinkText: { color: COLORS.blue, marginLeft: 5, fontWeight: '600' },
    detailActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
    detailBtn: { padding: 12, borderRadius: 10, alignItems: 'center', flex: 1, marginHorizontal: 5 },
    btnText: { color: 'white', fontWeight: 'bold' },
    closeCircle: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 },

    // Форма
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    input: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    photoBtn: { backgroundColor: COLORS.blue, padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    iosCallout: { padding: 5, minWidth: 100, alignItems: 'center' }
});
