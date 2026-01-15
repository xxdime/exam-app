import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
    TextInput, Modal, SafeAreaView, Linking, Alert, KeyboardAvoidingView, Platform, ListRenderItem, ScrollView, StatusBar, Animated, Dimensions
} from 'react-native';
import MapView, { Marker, Callout, LongPressEvent, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ВАЖНО: Убедитесь, что установлен: npx expo install expo-linear-gradient
import { LinearGradient } from 'expo-linear-gradient'; 

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

const STORAGE_KEY = '@user_places_v3_dark'; // Новый ключ для новой версии

// --- НОВАЯ ПАЛИТРА (ТЕМНАЯ ТЕМА + ЯРКИЙ ФЛАГ) ---
const COLORS = {
    // Флаг Карелии (более насыщенные версии для темного фона)
    karelianRed: '#FF3333',      
    karelianBlue: '#0066CC',     
    karelianGreen: '#00AA55',
    
    // Основа темной темы
    bgMain: '#121212',       // Почти черный фон
    bgCard: '#1E1E1E',       // Темно-серые карточки
    bgInput: '#2C2C2C',      // Фон полей ввода
    
    // Текст
    textWhite: '#FFFFFF',    // Основной текст
    textGrey: '#AAAAAA',     // Вторичный текст
    
    // Акценты
    accentGradientStart: '#0066CC', // Синий для начала градиентов
    accentGradientEnd: '#00AA55',   // Зеленый для конца градиентов
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const INITIAL_PLACES: Place[] = [
    {
        id: '1',
        title: 'Онежская набережная',
        description: 'Эпицентр городской жизни. Музей современного искусства под открытым небом на берегу великого Онега. Место силы и долгих прогулок.',
        website: 'https://wiki-karelia.ru',
        image: null,
        coordinate: { latitude: 61.7905, longitude: 34.3900 }
    },
    {
        id: '2',
        title: 'Национальный музей Карелии',
        description: 'Погружение в историю Севера. От древних петроглифов до тайн карельских шаманов и быта губернского города.',
        website: 'http://nmrk.karelia.ru/',
        image: null,
        coordinate: { latitude: 61.7850, longitude: 34.3600 }
    }
];

const DEFAULT_REGION = {
    latitude: 61.7846, longitude: 34.3469,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
};

// --- КОМПОНЕНТ: АБСТРАКТНЫЙ ФЛАГ В ШАПКЕ ---
const FlagHeader = () => (
    <View style={styles.flagHeaderContainer}>
        <View style={styles.flagHeaderContent}>
            <Text style={styles.headerTitleBig}>PTZ</Text>
            <Text style={styles.headerTitleSmall}>GUIDE</Text>
        </View>
        {/* Абстрактные цветовые блоки флага */}
        <View style={[styles.flagBlock, { backgroundColor: COLORS.karelianRed, right: -20, top: -50, transform: [{ rotate: '15deg' }] }]} />
        <View style={[styles.flagBlock, { backgroundColor: COLORS.karelianBlue, right: 40, top: -70, transform: [{ rotate: '25deg' }] }]} />
        <View style={[styles.flagBlock, { backgroundColor: COLORS.karelianGreen, right: 100, top: -90, transform: [{ rotate: '35deg' }] }]} />
    </View>
);

// --- НОВЫЙ КОМПОНЕНТ: "О ГОРОДЕ" (В СТИЛЕ ВИКИПЕДИИ, НО ИММЕРСИВНО) ---
const AboutCity = () => (
    <View style={{ flex: 1, backgroundColor: COLORS.bgMain }}>
        <FlagHeader />
        <ScrollView contentContainerStyle={styles.aboutContainer}>
            <View style={styles.aboutHeaderImageContainer}>
                {/* Плейсхолдер для фото города (можно заменить на реальное изображение) */}
                <View style={styles.aboutHeaderImage}>
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']}
                        style={styles.immersiveGradient}
                    />
                    <View style={styles.aboutTitleOverlay}>
                        <Text style={styles.aboutTitle}>ПЕТРОЗАВОДСК</Text>
                        <Text style={styles.aboutSubtitle}>Столица Республики Карелия</Text>
                    </View>
                </View>
            </View>

            {/* Декоративная линия флага */}
            <View style={styles.flagLine}>
                <View style={{ flex: 1, backgroundColor: COLORS.karelianRed }} />
                <View style={{ flex: 1, backgroundColor: COLORS.karelianBlue }} />
                <View style={{ flex: 1, backgroundColor: COLORS.karelianGreen }} />
            </View>

            <Text style={styles.aboutSectionTitle}>Общая информация</Text>
            <Text style={styles.aboutText}>
                Петрозаводск — город на северо-западе России, административный центр Республики Карелия. Расположен на берегу Онежского озера, второго по величине пресноводного озера в Европе. Население составляет около 280 тысяч человек (по данным на 2023 год). Город является важным транспортным узлом, промышленным и культурным центром региона.
            </Text>

            <Text style={styles.aboutSectionTitle}>История</Text>
            <Text style={styles.aboutText}>
                Основан в 1703 году по указу Петра I как Петровский завод для производства пушек и якорей для Балтийского флота. В 1777 году получил статус города и название Петрозаводск. В XIX веке стал губернским центром Олонецкой губернии. В советское время развивался как промышленный центр, а после 1991 года — как столица Республики Карелия. Город богат историческими памятниками, включая архитектуру XVIII–XIX веков.
            </Text>

            <Text style={styles.aboutSectionTitle}>География и климат</Text>
            <Text style={styles.aboutText}>
                Петрозаводск расположен в зоне тайги, на берегу Онежского озера. Климат умеренно континентальный с влиянием Балтийского моря: прохладное лето (средняя температура июля +17°C) и умеренно холодная зима (января −9°C). Город окружен лесами и озерами, что делает его привлекательным для экотуризма. Площадь города — около 135 км².
            </Text>

            <Text style={styles.aboutSectionTitle}>Экономика и транспорт</Text>
            <Text style={styles.aboutText}>
                Основные отрасли: машиностроение, лесная промышленность, туризм. Город имеет международный аэропорт "Петрозаводск", железнодорожный вокзал (линия Санкт-Петербург — Мурманск) и порт на Онежском озере. Автомобильные трассы связывают с Москвой, Санкт-Петербургом и Финляндией.
            </Text>

            <Text style={styles.aboutSectionTitle}>Культура и достопримечательности</Text>
            <Text style={styles.aboutText}>
                Петрозаводск известен Онежской набережной с скульптурами, Национальным музеем Республики Карелия, театрами и фестивалями. В окрестностях — острова Кижи (ЮНЕСКО) с деревянной архитектурой. Город — центр карельской и вепсской культуры, с традициями фольклора и ремесел.
            </Text>

            <Text style={styles.aboutSectionTitle}>Население и общество</Text>
            <Text style={styles.aboutText}>
                Этнический состав: русские (около 80%), карелы, финны, вепсы. Город имеет развитую систему образования (Петрозаводский государственный университет) и здравоохранения. Петрозаводск — экологически чистый город с высоким качеством жизни.
            </Text>

            {/* Декоративный градиентный блок в конце */}
            <LinearGradient
                colors={[COLORS.accentGradientStart, COLORS.accentGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.aboutFooter}
            >
                <Text style={styles.aboutFooterText}>Откройте Петрозаводск с PTZ GUIDE</Text>
            </LinearGradient>
        </ScrollView>
    </View>
);

export default function App() {
    const [currentView, setCurrentView] = useState<'map' | 'list' | 'about'>('map');
    const [places, setPlaces] = useState<Place[]>([]);
    const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
    const [mapKey, setMapKey] = useState(0);
    const scrollY = useRef(new Animated.Value(0)).current;

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
        if (!newPlaceTitle || !tempCoord) { Alert.alert('Ошибка', 'Добавьте название места'); return; }
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
        Alert.alert("Удаление", "Стереть это место с карты?", [
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
            allowsEditing: true, aspect: [16, 9], quality: 0.7, // Широкий формат для нового дизайна
        });
        if (!res.canceled) setNewPlaceImage(res.assets[0].uri);
    };

    // --- НОВЫЙ ДИЗАЙН КАРТОЧКИ СПИСКА (БОЛЬШАЯ, ИММЕРСИВНАЯ) ---
    const renderListItem: ListRenderItem<Place> = ({ item, index }) => {
        const inputRange = [ -1, 0, index * 280, (index + 2) * 280];
        const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [1, 1, 1, 0.5] // Эффект затухания при прокрутке
        });
        const scale = scrollY.interpolate({
             inputRange,
             outputRange: [1, 1, 1, 0.95]
        });

        return (
            <Animated.View style={[styles.immersiveCardContainer, { opacity, transform: [{scale}] }]}>
                <TouchableOpacity style={styles.immersiveCard} onPress={() => openViewModal(item)} activeOpacity={0.95}>
                    <View style={styles.immersiveImageContainer}>
                        {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.immersiveImage} />
                        ) : (
                            <View style={styles.immersivePlaceholder}>
                                <Ionicons name="image-outline" size={60} color={COLORS.textGrey} style={{opacity: 0.3}} />
                                <Text style={{color: COLORS.textGrey, marginTop: 10}}>Нет фото</Text>
                            </View>
                        )}
                         {/* Мощный градиент для читаемости текста */}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']}
                            style={styles.immersiveGradient}
                        />
                        <View style={styles.immersiveContentOverlay}>
                            {/* Декоративная цветная полоса слева */}
                            <View style={[styles.accentStrip, { backgroundColor: index % 3 === 0 ? COLORS.karelianRed : (index % 3 === 1 ? COLORS.karelianBlue : COLORS.karelianGreen) }]} />
                            <View style={{flex: 1}}>
                                <Text style={styles.immersiveTitle} numberOfLines={2}>{item.title.toUpperCase()}</Text>
                                <Text style={styles.immersiveDesc} numberOfLines={2}>{item.description || 'Описание отсутствует...'}</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.immersiveActions}>
                         <TouchableOpacity style={styles.actionBtnText} onPress={() => goToPlaceOnMap(item)}>
                            <Text style={{color: COLORS.karelianBlue, fontWeight: 'bold'}}>НА КАРТУ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtnDark} onPress={() => deletePlace(item.id)}>
                            <Ionicons name="trash-outline" size={20} color={COLORS.karelianRed} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bgMain} />
            
            <View style={{ flex: 1 }}>
                {currentView === 'map' ? (
                    <View style={{ flex: 1 }}>
                         <FlagHeader />
                        <MapView
                            key={mapKey}
                            style={styles.map}
                            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                            initialRegion={mapRegion}
                            onLongPress={handleLongPress}
                            // Попытка симулировать темную карту (не идеально без Google Cloud Styling)
                            customMapStyle={[
                                { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
                                { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
                                { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
                                { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
                                { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
                                { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
                                { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
                                { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
                                { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
                                { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
                            ]}
                        >
                            {places.map((p, index) => (
                                <Marker
                                    key={p.id}
                                    coordinate={p.coordinate}
                                    // Чередуем цвета маркеров
                                    pinColor={index % 3 === 0 ? COLORS.karelianRed : (index % 3 === 1 ? COLORS.karelianBlue : COLORS.karelianGreen)}
                                    onCalloutPress={() => openViewModal(p)}
                                >
                                    <Callout tooltip>
                                        <View style={styles.darkCallout}>
                                            <Text style={styles.calloutText}>{p.title}</Text>
                                        </View>
                                    </Callout>
                                </Marker>
                            ))}
                        </MapView>
                        
                        <LinearGradient colors={[COLORS.bgMain, 'transparent']} style={styles.topMapGradient} />
                        
                        {/* Плашка подсказки */}
                        <View style={styles.hintFloating}>
                             <Ionicons name="add-circle" size={24} color={COLORS.karelianGreen} />
                            <Text style={styles.hintText}>Долгое нажатие на карту, чтобы добавить место</Text>
                        </View>
                    </View>
                ) : currentView === 'list' ? (
                    <View style={{flex: 1, backgroundColor: COLORS.bgMain}}>
                        <FlagHeader />
                        <Animated.FlatList 
                            data={places} 
                            renderItem={renderListItem} 
                            keyExtractor={p => p.id} 
                            contentContainerStyle={styles.listContainer}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                                { useNativeDriver: true }
                            )}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                ) : (
                    <AboutCity />
                )}
            </View>

            {/* НОВЫЙ ТАБ-БАР (ПЛАВАЮЩИЙ, ТЕМНЫЙ, С ТРЕТЬЕЙ КНОПКОЙ) */}
            <View style={styles.floatingTabBarContainer}>
                <View style={[styles.floatingTabBar, { width: SCREEN_WIDTH * 0.7 }]}>
                    <TouchableOpacity 
                        style={styles.tab} 
                        onPress={() => setCurrentView('map')}
                    >
                         {currentView === 'map' && <View style={[styles.activeIndicator, {backgroundColor: COLORS.karelianBlue}]} />}
                        <Ionicons name={currentView === 'map' ? "map" : "map-outline"} size={26} color={currentView === 'map' ? COLORS.textWhite : COLORS.textGrey} />
                    </TouchableOpacity>
                    
                    <View style={styles.tabDivider} />

                    <TouchableOpacity 
                        style={styles.tab} 
                        onPress={() => setCurrentView('list')}
                    >
                        {currentView === 'list' && <View style={[styles.activeIndicator, {backgroundColor: COLORS.karelianRed}]} />}
                        <Ionicons name={currentView === 'list' ? "list" : "list-outline"} size={26} color={currentView === 'list' ? COLORS.textWhite : COLORS.textGrey} />
                    </TouchableOpacity>
                    
                    <View style={styles.tabDivider} />

                    <TouchableOpacity 
                        style={styles.tab} 
                        onPress={() => setCurrentView('about')}
                    >
                        {currentView === 'about' && <View style={[styles.activeIndicator, {backgroundColor: COLORS.karelianGreen}]} />}
                        <Ionicons name={currentView === 'about' ? "information-circle" : "information-circle-outline"} size={26} color={currentView === 'about' ? COLORS.textWhite : COLORS.textGrey} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* МОДАЛКА: ПРОСМОТР (FULLSCREEN DARK) */}
            <Modal visible={viewModalVisible} animationType="slide" transparent={true} statusBarTranslucent>
                <View style={styles.fullScreenModal}>
                    <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                        <View style={styles.fsImageContainer}>
                            {selectedPlace?.image ? (
                                <Image source={{ uri: selectedPlace.image }} style={styles.fsImage} />
                            ) : (
                                <View style={[styles.fsImage, styles.immersivePlaceholder, {backgroundColor: COLORS.bgCard}]}>
                                    <Ionicons name="image" size={100} color={COLORS.bgInput} />
                                </View>
                            )}
                            {/* Градиент сверху для кнопки закрытия */}
                            <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.topGradient} />
                            {/* Градиент снизу для заголовка */}
                            <LinearGradient colors={['transparent', COLORS.bgMain]} style={styles.bottomGradient} />
                            
                            <Text style={styles.fsTitle}>{selectedPlace?.title.toUpperCase()}</Text>
                        </View>

                        <View style={styles.fsBody}>
                             {/* Декоративная линия флага */}
                             <View style={{flexDirection: 'row', height: 4, width: 100, marginBottom: 25}}>
                                <View style={{flex:1, backgroundColor: COLORS.karelianRed}}/>
                                <View style={{flex:1, backgroundColor: COLORS.karelianBlue}}/>
                                <View style={{flex:1, backgroundColor: COLORS.karelianGreen}}/>
                             </View>

                            <Text style={styles.fsDesc}>{selectedPlace?.description || 'Описание отсутствует'}</Text>

                            {selectedPlace?.website ? (
                                <TouchableOpacity style={styles.webLinkDark} onPress={() => Linking.openURL(selectedPlace.website)}>
                                    <Ionicons name="globe" size={22} color={COLORS.karelianBlue} />
                                    <Text style={styles.webLinkText}>Открыть веб-сайт</Text>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.textGrey} style={{marginLeft: 'auto'}}/>
                                </TouchableOpacity>
                            ) : null}

                            <View style={styles.fsActions}>
                                <TouchableOpacity activeOpacity={0.8} onPress={() => selectedPlace && goToPlaceOnMap(selectedPlace)}>
                                    <LinearGradient colors={[COLORS.karelianBlue, COLORS.karelianGreen]} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.gradientBtn}>
                                        <Text style={styles.gradientBtnText}>ПОКАЗАТЬ НА КАРТЕ</Text>
                                        <Ionicons name="navigate" size={20} color="white" style={{marginLeft: 10}}/>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.outlineBtnDanger} onPress={() => selectedPlace && deletePlace(selectedPlace.id)}>
                                    <Text style={styles.outlineBtnText}>УДАЛИТЬ МЕСТО</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                    
                    <TouchableOpacity style={styles.closeCircleDark} onPress={() => setViewModalVisible(false)}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* МОДАЛКА: ДОБАВЛЕНИЕ (DARK FORM) */}
            <Modal visible={addModalVisible} animationType="fade" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? "padding" : "height"} style={styles.modalOverlayDark}>
                    <View style={styles.modalContentDark}>
                        <View style={styles.modalHeaderDark}>
                            <Text style={styles.modalTitleDark}>НОВАЯ ТОЧКА</Text>
                            {/* Маленький флаг */}
                            <View style={{flexDirection: 'row', height: 4, width: 30, marginTop: 5}}>
                                <View style={{flex:1, backgroundColor: COLORS.karelianRed}}/>
                                <View style={{flex:1, backgroundColor: COLORS.karelianBlue}}/>
                                <View style={{flex:1, backgroundColor: COLORS.karelianGreen}}/>
                             </View>
                        </View>
                        
                        <ScrollView contentContainerStyle={{padding: 20}}>
                            <Text style={styles.labelDark}>НАЗВАНИЕ</Text>
                            <TextInput style={styles.inputDark} placeholder="Что это за место?" placeholderTextColor={COLORS.textGrey} onChangeText={setNewPlaceTitle} />
                            
                            <Text style={styles.labelDark}>ОПИСАНИЕ</Text>
                            <TextInput style={[styles.inputDark, styles.textAreaDark]} placeholder="Ваши впечатления..." placeholderTextColor={COLORS.textGrey} multiline onChangeText={setNewPlaceDesc} />
                            
                            <Text style={styles.labelDark}>САЙТ</Text>
                            <TextInput style={styles.inputDark} placeholder="https://" placeholderTextColor={COLORS.textGrey} autoCapitalize="none" onChangeText={setNewPlaceWeb} />
                            
                            <TouchableOpacity style={styles.photoBtnDark} onPress={pickImage}>
                                {newPlaceImage ? (
                                    <Image source={{ uri: newPlaceImage }} style={styles.previewImage} />
                                ) : (
                                    <>
                                    <Ionicons name="camera-outline" size={28} color={COLORS.karelianBlue} style={{marginBottom: 5}}/>
                                    <Text style={styles.photoBtnTextDark}>Добавить фото</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={styles.formActionsDark}>
                                <TouchableOpacity style={styles.cancelBtnDark} onPress={() => setAddModalVisible(false)}>
                                    <Text style={styles.cancelBtnTextDark}>ОТМЕНА</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={0.8} onPress={saveNewPlace} style={{flex: 1, marginLeft: 10}}>
                                     <LinearGradient colors={[COLORS.karelianRed, COLORS.karelianBlue]} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.gradientBtnSmall}>
                                        <Text style={styles.gradientBtnText}>СОХРАНИТЬ</Text>
                                     </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgMain },
    
    // --- НОВАЯ ШАПКА С АБСТРАКТНЫМ ФЛАГОМ ---
    flagHeaderContainer: {
        height: 110,
        backgroundColor: COLORS.bgMain,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingHorizontal: 25,
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
    },
    flagHeaderContent: { zIndex: 2 },
    headerTitleBig: { fontSize: 34, fontWeight: '900', color: COLORS.textWhite, letterSpacing: 1, lineHeight: 34 },
    headerTitleSmall: { fontSize: 14, fontWeight: '700', color: COLORS.karelianBlue, letterSpacing: 3 },
    // Абстрактные блоки флага
    flagBlock: {
        position: 'absolute',
        width: 120,
        height: 200,
        opacity: 0.25, // Полупрозрачность для наложения
        zIndex: 1,
    },

    // --- MAP & HINTS ---
    map: { flex: 1 },
    topMapGradient: { position: 'absolute', top: 0, width: '100%', height: 120, zIndex: 5, pointerEvents: 'none' },
    hintFloating: { 
        position: 'absolute', bottom: 100, alignSelf: 'center', 
        backgroundColor: 'rgba(30,30,30,0.9)', 
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, 
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    hintText: { fontSize: 13, fontWeight: '600', color: COLORS.textWhite, marginLeft: 10 },
    
    darkCallout: { backgroundColor: COLORS.bgCard, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.karelianBlue, minWidth: 150 },
    calloutText: { color: COLORS.textWhite, fontWeight: 'bold', textAlign: 'center' },

    // --- НОВЫЙ СПИСОК (ИММЕРСИВНЫЕ КАРТОЧКИ) ---
    listContainer: { padding: 20, paddingBottom: 100, paddingTop: 10 },
    immersiveCardContainer: { marginBottom: 25 },
    immersiveCard: { 
        backgroundColor: COLORS.bgCard, 
        borderRadius: 24, 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    immersiveImageContainer: { height: 260, position: 'relative' },
    immersiveImage: { width: '100%', height: '100%' },
    immersivePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgInput },
    immersiveGradient: { position: 'absolute', bottom: 0, width: '100%', height: '70%' },
    immersiveContentOverlay: { 
        position: 'absolute', bottom: 20, left: 0, right: 20, 
        flexDirection: 'row', alignItems: 'flex-end' 
    },
    accentStrip: { width: 6, height: '90%', marginRight: 15, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
    immersiveTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textWhite, marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 },
    immersiveDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18, maxWidth: '90%' },
    
    immersiveActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)'},
    actionBtnText: { paddingVertical: 5, paddingHorizontal: 10 },
    iconBtnDark: { padding: 5 },

    // --- ПЛАВАЮЩИЙ ТАБ-БАР ---
    floatingTabBarContainer: { position: 'absolute', bottom: 25, width: '100%', alignItems: 'center' },
    floatingTabBar: { 
        flexDirection: 'row', 
        width: SCREEN_WIDTH * 0.6,
        height: 60,
        backgroundColor: 'rgba(30,30,30,0.95)', // Почти непрозрачный темный
        borderRadius: 35,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    },
    tab: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%', position: 'relative' },
    activeIndicator: { position: 'absolute', top: 10, width: 6, height: 6, borderRadius: 3 },
    tabDivider: { width: 1, height: '40%', backgroundColor: 'rgba(255,255,255,0.1)' },

    // --- FULLSCREEN MODAL ---
    fullScreenModal: { flex: 1, backgroundColor: COLORS.bgMain },
    fsImageContainer: { height: SCREEN_WIDTH, position: 'relative' }, // Квадратное фото
    fsImage: { width: '100%', height: '100%' },
    topGradient: { position: 'absolute', top: 0, width: '100%', height: 100 },
    bottomGradient: { position: 'absolute', bottom: 0, width: '100%', height: 150 },
    fsTitle: { position: 'absolute', bottom: 30, left: 25, right: 25, fontSize: 32, fontWeight: '900', color: COLORS.textWhite, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
    
    fsBody: { padding: 25, paddingBottom: 50 },
    fsDesc: { fontSize: 18, color: COLORS.textGrey, lineHeight: 28, marginBottom: 30 },
    
    webLinkDark: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, padding: 16, borderRadius: 16, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    webLinkText: { color: COLORS.textWhite, marginLeft: 12, fontWeight: '600', fontSize: 16 },
    
    fsActions: { marginTop: 10 },
    gradientBtn: { paddingVertical: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    gradientBtnSmall: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    gradientBtnText: { color: COLORS.textWhite, fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
    outlineBtnDanger: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.karelianRed },
    outlineBtnText: { color: COLORS.karelianRed, fontWeight: '700', fontSize: 14 },
    
    closeCircleDark: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 30, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

    // --- DARK ADD FORM ---
    modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContentDark: { backgroundColor: COLORS.bgMain, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', maxHeight: '90%' },
    modalHeaderDark: { padding: 20, borderBottomWidth: 1, borderColor: COLORS.bgInput, alignItems: 'center' },
    modalTitleDark: { fontSize: 18, fontWeight: '900', color: COLORS.textWhite, letterSpacing: 1 },
    labelDark: { fontSize: 12, fontWeight: '700', color: COLORS.karelianBlue, marginBottom: 8, marginTop: 15, letterSpacing: 0.5 },
    inputDark: { backgroundColor: COLORS.bgInput, padding: 16, borderRadius: 14, color: COLORS.textWhite, fontSize: 16, borderWidth: 1, borderColor: 'transparent' },
    textAreaDark: { height: 120, textAlignVertical: 'top' },
    photoBtnDark: { height: 180, backgroundColor: COLORS.bgInput, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 25, marginBottom: 15, borderWidth: 1, borderColor: COLORS.bgInput, borderStyle: 'dashed' },
    previewImage: { width: '100%', height: '100%', borderRadius: 14 },
    photoBtnTextDark: { color: COLORS.textGrey, fontWeight: '600', fontSize: 14 },
    
    formActionsDark: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    cancelBtnDark: { padding: 16, borderRadius: 14, flex: 1, alignItems: 'center', backgroundColor: COLORS.bgInput, marginRight: 10 },
    cancelBtnTextDark: { color: COLORS.textWhite, fontWeight: '600' },

    // --- НОВЫЕ СТИЛИ ДЛЯ "О ГОРОДЕ" ---
    aboutContainer: { padding: 20, paddingBottom: 100 },
    aboutHeaderImageContainer: { height: 260, position: 'relative', marginBottom: 20 },
    aboutHeaderImage: { width: '100%', height: '100%', backgroundColor: COLORS.bgInput, borderRadius: 24 }, // Замените на Image, если есть фото
    aboutTitleOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20 },
    aboutTitle: { fontSize: 32, fontWeight: '900', color: COLORS.textWhite, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    aboutSubtitle: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 5 },
    flagLine: { flexDirection: 'row', height: 4, width: '100%', marginBottom: 30, borderRadius: 2, overflow: 'hidden' },
    aboutSectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.karelianBlue, marginBottom: 10, letterSpacing: 0.5 },
    aboutText: { fontSize: 16, color: COLORS.textGrey, lineHeight: 24, marginBottom: 25 },
    aboutFooter: { padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 20 },
    aboutFooterText: { fontSize: 16, fontWeight: '700', color: COLORS.textWhite, letterSpacing: 0.5 },
});