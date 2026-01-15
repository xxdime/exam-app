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
    isRecommended?: boolean; // Новое поле: является ли место рекомендуемым (изначальным)
}

const STORAGE_KEY = '@user_places_v14_dark'; // Обновленный ключ для новой версии

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
        image: 'https://inkarelia.ru/wp-content/uploads/2023/10/Onega_embankment_24.jpg',
        coordinate: { latitude: 61.793828, longitude: 34.380368 },
        isRecommended: true
    },
    {
        id: '2',
        title: 'Национальный музей Карелии',
        description: 'Погружение в историю Севера. От древних петроглифов до тайн карельских шаманов и быта губернского города.',
        website: 'http://nmrk.karelia.ru/',
        image: 'https://kareliamuseum.ru/upload/medialibrary/5d1/t8mx49xwqg7zd5dlkfrczolkqn1t4whr.jpg',
        coordinate: { latitude: 61.787008, longitude: 34.363856 },
        isRecommended: true
    },
    {
        id: '3',
        title: 'Музей изобразительных искусств',
        description: 'Коллекция русского и европейского искусства, иконописи и карельского народного творчества в здании бывшей гимназии XVIII века.',
        website: 'https://artmuseum.karelia.ru/',
        image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/05/00/f8/67/caption.jpg',
        coordinate: { latitude: 61.788020, longitude: 34.382012 },
        isRecommended: true
    },
    {
        id: '4',
        title: 'Морской музей «Полярный Одиссей»',
        description: 'Интерактивный музей под открытым небом с копиями исторических парусных судов, которые можно трогать и на которые иногда разрешают забираться.',
        website: '',
        image: 'https://tvoyakarelia.com/gallery/20140923162603_70ee8.webp',
        coordinate: { latitude: 61.779555, longitude: 34.415193 },
        isRecommended: true
    },
    {
        id: '5',
        title: 'Собор Александра Невского',
        description: 'Главный кафедральный собор Карелии в стиле неоклассицизма, памятник архитектуры и важный духовный центр.',
        website: '',
        image: 'https://www.advantour.com/russia/images/petrozavodsk/petrozavodsk-alexander-nevsky-cathedral.jpg',
        coordinate: { latitude: 61.781239, longitude: 34.379974 },
        isRecommended: true
    },
    {
        id: '6',
        title: 'Губернаторский парк',
        description: 'Исторический тенистый парк в самом центре города с многовековыми лиственницами и атмосферой старины.',
        website: '',
        image: 'https://www.advantour.com/russia/images/petrozavodsk/petrozavodsk-governors-park.jpg',
        coordinate: { latitude: 61.785837, longitude: 34.364089 },
        isRecommended: true
    },
    {
        id: '7',
        title: 'Петрозаводский государственный университет',
        description: 'Главный вуз Карелии, основанный в 1940 году. Научный и образовательный центр Северо-Запада России с уникальным архитектурным ансамблем. Здесь учатся студенты со всей России и из-за рубежа.',
        website: 'https://petrsu.ru/',
        image: 'https://stolicaonego.ru/images/news/547/547750/main.jpg',
        coordinate: { latitude: 61.786157, longitude: 34.352520 },
        isRecommended: true
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
                {/* ЗАМЕНА: Используем Image с сетевым источником */}
                <Image
                    source={{ uri: 'https://www.advantour.com/img/russia/images/petrozavodsk.jpg' }}
                    style={styles.aboutHeaderImage}
                    resizeMode="cover" // Это важно для правильного заполнения области
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']}
                    style={styles.immersiveGradient}
                />
                <View style={styles.aboutTitleOverlay}>
                    <Text style={styles.aboutTitle}>ПЕТРОЗАВОДСК</Text>
                    <Text style={styles.aboutSubtitle}>Столица Республики Карелия</Text>
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

// --- КОМПОНЕНТ: ПОИСКОВАЯ ПАНЕЛЬ ---
const SearchBar = ({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (query: string) => void }) => (
    <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textGrey} style={styles.searchIcon} />
        <TextInput
            style={styles.searchInput}
            placeholder="Поиск по названию или описанию..."
            placeholderTextColor={COLORS.textGrey}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={COLORS.textGrey} />
            </TouchableOpacity>
        )}
    </View>
);

// --- КОМПОНЕНТ: ЗАГОЛОВОК СЕКЦИИ ---
const SectionHeader = ({ title, color }: { title: string; color: string }) => (
    <View style={styles.sectionHeader}>
        <View style={[styles.sectionHeaderLine, { backgroundColor: color }]} />
        <Text style={styles.sectionHeaderText}>{title}</Text>
        <View style={[styles.sectionHeaderLine, { backgroundColor: color }]} />
    </View>
);

export default function App() {
    const [currentView, setCurrentView] = useState<'map' | 'list' | 'about'>('map');
    const [places, setPlaces] = useState<Place[]>([]);
    const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
    const scrollY = useRef(new Animated.Value(0)).current;
    const [searchQuery, setSearchQuery] = useState('');
    
    // Ref для доступа к MapView
    const mapRef = useRef<MapView>(null);

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
            if (stored) {
                const parsedPlaces = JSON.parse(stored) as Place[];
                // Добавляем флаг isRecommended к старым данным, если его нет
                const updatedPlaces = parsedPlaces.map(place => ({
                    ...place,
                    isRecommended: place.isRecommended || place.id === '1' || place.id === '2'
                }));
                setPlaces(updatedPlaces);
            } else { 
                setPlaces(INITIAL_PLACES); 
                savePlaces(INITIAL_PLACES); 
            }
        } catch (e) { console.error(e); }
    };

    const savePlaces = async (data: Place[]) => {
        try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (e) { console.error(e); }
    };

    // Фильтрация мест по поисковому запросу
    const filteredPlaces = places.filter(place => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            place.title.toLowerCase().includes(query) ||
            (place.description && place.description.toLowerCase().includes(query))
        );
    });

    // Разделение мест на рекомендуемые и пользовательские
    const recommendedPlaces = filteredPlaces.filter(place => place.isRecommended);
    const userPlaces = filteredPlaces.filter(place => !place.isRecommended);

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
            coordinate: tempCoord,
            isRecommended: false // Все новые места - пользовательские
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
        const placeToDelete = places.find(p => p.id === id);
        if (placeToDelete?.isRecommended) {
            Alert.alert("Нельзя удалить", "Это рекомендуемое место нельзя удалить");
            return;
        }

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
        const newRegion = {
            latitude: place.coordinate.latitude,
            longitude: place.coordinate.longitude,
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
        };
        
        // Обновляем состояние региона
        setMapRegion(newRegion);
        
        // Переключаемся на карту
        setCurrentView('map');
        setViewModalVisible(false);
        
        // Используем setTimeout для гарантии, что карта успеет перерендериться
        setTimeout(() => {
            // Пытаемся использовать animateToRegion, если mapRef доступен
            if (mapRef.current) {
                mapRef.current.animateToRegion(newRegion, 1000);
            }
            // Если mapRef не доступен, полагаемся на setMapRegion
        }, 100);
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

        // Определяем цвет в зависимости от типа места
        const accentColor = item.isRecommended ? COLORS.karelianBlue : COLORS.karelianGreen;

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
                            <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />
                            <View style={{flex: 1}}>
                                <Text style={styles.immersiveTitle} numberOfLines={2}>
                                    {item.title.toUpperCase()}
                                    {item.isRecommended && (
                                        <Text style={{color: COLORS.karelianBlue, fontSize: 12}}> ★</Text>
                                    )}
                                </Text>
                                <Text style={styles.immersiveDesc} numberOfLines={2}>{item.description || 'Описание отсутствует...'}</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.immersiveActions}>
                         <TouchableOpacity style={styles.actionBtnText} onPress={() => goToPlaceOnMap(item)}>
                            <Text style={{color: COLORS.karelianBlue, fontWeight: 'bold'}}>НА КАРТУ</Text>
                        </TouchableOpacity>
                        {!item.isRecommended && (
                            <TouchableOpacity style={styles.iconBtnDark} onPress={() => deletePlace(item.id)}>
                                <Ionicons name="trash-outline" size={20} color={COLORS.karelianRed} />
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    // Рендер всего списка с секциями
    const renderListWithSections = () => (
        <View style={{flex: 1, backgroundColor: COLORS.bgMain}}>
            <FlagHeader />
            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            
            <Animated.FlatList 
                data={[]} // Используем renderItem только для отдельных элементов
                renderItem={null}
                keyExtractor={() => 'sections'}
                contentContainerStyle={styles.listContainer}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <>
                        {recommendedPlaces.length > 0 && (
                            <>
                                <SectionHeader 
                                    title="РЕКОМЕНДУЕМЫЕ МЕСТА" 
                                    color={COLORS.karelianBlue} 
                                />
                                {recommendedPlaces.map((item, index) => (
                                    <View key={`rec_${item.id}`}>
                                        {renderListItem({item, index})}
                                    </View>
                                ))}
                            </>
                        )}
                        
                        {userPlaces.length > 0 && (
                            <>
                                <SectionHeader 
                                    title="ВАШИ МЕСТА" 
                                    color={COLORS.karelianGreen} 
                                />
                                {userPlaces.map((item, index) => (
                                    <View key={`user_${item.id}`}>
                                        {renderListItem({item, index: recommendedPlaces.length + index})}
                                    </View>
                                ))}
                            </>
                        )}
                        
                        {filteredPlaces.length === 0 && (
                            <View style={styles.emptyState}>
                                <Ionicons name="search-outline" size={60} color={COLORS.textGrey} style={{opacity: 0.5}} />
                                <Text style={styles.emptyStateText}>
                                    {searchQuery ? 'Ничего не найдено' : 'Добавьте свои места на карте'}
                                </Text>
                                {searchQuery && (
                                    <Text style={styles.emptyStateSubtext}>
                                        Попробуйте изменить запрос поиска
                                    </Text>
                                )}
                            </View>
                        )}
                    </>
                }
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bgMain} />
            
            <View style={{ flex: 1 }}>
                {currentView === 'map' ? (
                    <View style={{ flex: 1 }}>
                         <FlagHeader />
                        <MapView
                            ref={mapRef} // Добавляем ref для доступа к карте
                            style={styles.map}
                            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                            initialRegion={DEFAULT_REGION}
                            region={mapRegion} // Используем region вместо initialRegion для контроля региона
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
                                    // Чередуем цвета маркеров, рекомендуемые - синие, пользовательские - зеленые
                                    pinColor={p.isRecommended ? COLORS.karelianBlue : COLORS.karelianGreen}
                                    onCalloutPress={() => openViewModal(p)}
                                >
                                    <Callout tooltip>
                                        <View style={styles.darkCallout}>
                                            <Text style={styles.calloutText}>{p.title}</Text>
                                            {p.isRecommended && (
                                                <Text style={{color: COLORS.karelianBlue, fontSize: 10}}>★ рекомендуемое</Text>
                                            )}
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
                    renderListWithSections()
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
                            
                            <Text style={styles.fsTitle}>
                                {selectedPlace?.title.toUpperCase()}
                                {selectedPlace?.isRecommended && (
                                    <Text style={{color: COLORS.karelianBlue, fontSize: 14}}> ★ рекомендуемое</Text>
                                )}
                            </Text>
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

                                {!selectedPlace?.isRecommended && (
                                    <TouchableOpacity style={styles.outlineBtnDanger} onPress={() => selectedPlace && deletePlace(selectedPlace.id)}>
                                        <Text style={styles.outlineBtnText}>УДАЛИТЬ МЕСТО</Text>
                                    </TouchableOpacity>
                                )}
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

    // --- ПОИСКОВАЯ ПАНЕЛЬ ---
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        marginHorizontal: 20,
        marginVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textWhite,
        fontSize: 16,
        paddingVertical: 14,
    },
    clearButton: {
        padding: 5,
    },

    // --- ЗАГОЛОВКИ СЕКЦИЙ ---
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
        marginHorizontal: 5,
    },
    sectionHeaderLine: {
        flex: 1,
        height: 2,
        borderRadius: 1,
    },
    sectionHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textGrey,
        marginHorizontal: 12,
        letterSpacing: 1.5,
    },

    // --- ПУСТОЙ ЭКРАН ---
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        color: COLORS.textGrey,
        marginTop: 20,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: COLORS.textGrey,
        marginTop: 10,
        opacity: 0.7,
        textAlign: 'center',
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
    listContainer: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },
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