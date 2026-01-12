import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity, 
  TextInput, Modal, SafeAreaView, Linking, Alert, KeyboardAvoidingView, Platform, ListRenderItem, Dimensions 
} from 'react-native';
import MapView, { Marker, Callout, LongPressEvent } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

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

// --- ЦВЕТА КАРЕЛИИ ---
const COLORS = {
  red: '#D32F2F',
  blue: '#1976D2',
  green: '#388E3C',
  white: '#FFFFFF',
  bg: '#F5F5F5',
  text: '#333333'
};

// --- НАЧАЛЬНЫЕ ДАННЫЕ ---
const INITIAL_PLACES: Place[] = [
  {
    id: '1',
    title: 'Онежская набережная',
    description: 'Сердце Петрозаводска, музей скульптур под открытым небом.',
    website: 'https://wiki-karelia.ru',
    image: null,
    coordinate: { latitude: 61.7905, longitude: 34.3900 }
  },
  {
    id: '2',
    title: 'Национальный музей',
    description: 'Крупнейший музей Республики Карелия.',
    website: 'http://nmrk.karelia.ru/',
    image: null,
    coordinate: { latitude: 61.7850, longitude: 34.3600 }
  }
];

export default function App() {
  // Состояние: 'map' или 'list' - переключает экраны
  const [currentView, setCurrentView] = useState<'map' | 'list'>('map');
  const [places, setPlaces] = useState<Place[]>(INITIAL_PLACES);

  // --- ЛОГИКА ДОБАВЛЕНИЯ (КАРТА) ---
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlaceTitle, setNewPlaceTitle] = useState('');
  const [newPlaceDesc, setNewPlaceDesc] = useState('');
  const [newPlaceWeb, setNewPlaceWeb] = useState('');
  const [newPlaceImage, setNewPlaceImage] = useState<string | null>(null);
  const [selectedCoord, setSelectedCoord] = useState<Coordinate | null>(null);

  const handleLongPress = (e: LongPressEvent) => {
    setSelectedCoord(e.nativeEvent.coordinate);
    setModalVisible(true);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setNewPlaceImage(result.assets[0].uri);
    }
  };

  const savePlace = () => {
    if (!newPlaceTitle || !selectedCoord) {
      Alert.alert('Ошибка', 'Введите название места');
      return;
    }
    const place: Place = {
      id: Date.now().toString(),
      title: newPlaceTitle,
      description: newPlaceDesc,
      website: newPlaceWeb,
      image: newPlaceImage,
      coordinate: selectedCoord
    };
    setPlaces([...places, place]);
    closeModal();
  };

  const closeModal = () => {
    setModalVisible(false);
    setNewPlaceTitle(''); setNewPlaceDesc(''); setNewPlaceWeb(''); setNewPlaceImage(null); setSelectedCoord(null);
  };

  // --- ОТРИСОВКА КАРТОЧКИ СПИСКА ---
  const renderListItem: ListRenderItem<Place> = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="image-outline" size={40} color="#888" />
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.cardDesc}>{item.description}</Text>
        {item.website ? (
          <TouchableOpacity onPress={() => Linking.openURL(item.website)}>
            <Text style={styles.linkText}>Подробнее</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Петрозаводск Гид</Text>
      </View>

      {/* CONTENT AREA */}
      <View style={{ flex: 1 }}>
        {currentView === 'map' ? (
          <View style={{ flex: 1 }}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: 61.7846, longitude: 34.3469,
                latitudeDelta: 0.06, longitudeDelta: 0.06,
              }}
              onLongPress={handleLongPress}
            >
              {places.map((place) => (
                <Marker key={place.id} coordinate={place.coordinate}>
                  <Callout>
                    <View style={{ width: 150 }}>
                      <Text style={{ fontWeight: 'bold' }}>{place.title}</Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>Долгое нажатие на карту — добавить место</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={places}
            renderItem={renderListItem}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={{ padding: 10 }}
          />
        )}
      </View>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, currentView === 'map' && styles.activeTab]} 
          onPress={() => setCurrentView('map')}
        >
          <Ionicons name="map" size={24} color={currentView === 'map' ? COLORS.white : COLORS.text} />
          <Text style={[styles.tabText, currentView === 'map' && {color: COLORS.white}]}>Карта</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, currentView === 'list' && styles.activeTab]} 
          onPress={() => setCurrentView('list')}
        >
          <Ionicons name="grid" size={24} color={currentView === 'list' ? COLORS.white : COLORS.text} />
          <Text style={[styles.tabText, currentView === 'list' && {color: COLORS.white}]}>Список</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL (ADD PLACE) */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Новое место</Text>
            <TextInput style={styles.input} placeholder="Название" value={newPlaceTitle} onChangeText={setNewPlaceTitle} />
            <TextInput style={styles.input} placeholder="Описание" value={newPlaceDesc} onChangeText={setNewPlaceDesc} />
            <TextInput style={styles.input} placeholder="Сайт" value={newPlaceWeb} onChangeText={setNewPlaceWeb} />
            
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Text style={{color: COLORS.white}}>{newPlaceImage ? "Фото есть!" : "Загрузить фото"}</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, {backgroundColor: COLORS.red}]} onPress={closeModal}>
                <Text style={styles.btnText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, {backgroundColor: COLORS.green}]} onPress={savePlace}>
                <Text style={styles.btnText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { 
    padding: 15, paddingTop: 40, backgroundColor: COLORS.white, 
    borderBottomWidth: 4, borderBottomColor: COLORS.blue, alignItems: 'center' 
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  map: { width: '100%', height: '100%' },
  
  // Tabs Custom
  tabBar: {
    flexDirection: 'row', height: 70, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: '#ddd', elevation: 10
  },
  tabItem: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.red, // Красный фон активной вкладки
  },
  tabText: { fontSize: 12, marginTop: 4, fontWeight: 'bold', color: COLORS.text },

  // List Items
  card: {
    flex: 1, margin: 5, backgroundColor: COLORS.white, borderRadius: 10,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden'
  },
  cardImageContainer: { height: 100, width: '100%', backgroundColor: '#eee' },
  cardImage: { width: '100%', height: '100%' },
  cardContent: { padding: 8 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  cardDesc: { fontSize: 11, color: '#666', marginBottom: 4 },
  linkText: { color: COLORS.blue, fontSize: 11, fontWeight: 'bold' },

  // UI Elements
  hintBox: {
    position: 'absolute', top: 20, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 20,
    elevation: 5, borderLeftWidth: 5, borderLeftColor: COLORS.green
  },
  hintText: { fontSize: 12, fontWeight: '600' },
  
  // Modal
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '85%', backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderBottomWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12 },
  photoButton: { backgroundColor: COLORS.blue, padding: 10, borderRadius: 5, alignItems: 'center', marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { padding: 10, borderRadius: 5, width: '45%', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' }
});