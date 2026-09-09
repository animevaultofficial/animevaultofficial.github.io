import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const W = Dimensions.get('window').width;
const posters = [
  ['Demon Slayer', 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6HN7pJQ.jpg'],
  ['Solo Leveling', 'https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0ntD5o5YxX2XJ.jpg'],
  ['Jujutsu Kaisen', 'https://image.tmdb.org/t/p/w500/fHpKWq9ayzSk8nswqImgRw9gTNF.jpg'],
  ['One Piece', 'https://image.tmdb.org/t/p/w500/cMD9Ygz11zjJzAovURpO75GdvF.jpg'],
  ['Wednesday', 'https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg'],
];

function PosterRow({ title, items = posters }: { title: string; items?: string[][] }) {
  return <View style={{ marginBottom: 26 }}><View style={styles.rowTitle}><Text style={styles.section}>{title}</Text><Text style={styles.see}>See all</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>{items.map(([name, uri]) => <Pressable key={name} style={styles.card}><Image source={{ uri }} style={styles.poster}/><Text numberOfLines={1} style={styles.cardTitle}>{name}</Text><Text style={styles.meta}>Movie • HD</Text></Pressable>)}</ScrollView></View>;
}

export default function App() {
  const [tab, setTab] = useState('Home');
  const [search, setSearch] = useState('');
  return <SafeAreaView style={styles.root}><StatusBar style="light" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={styles.header}><View><Text style={styles.brand}>ANIME<Text style={styles.brandPink}>VAULT</Text></Text><Text style={styles.sub}>MOVIES • TV • DRAMAS</Text></View><View style={styles.headerIcons}><Ionicons name="notifications-outline" size={24} color="#fff"/><View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View></View></View>
      <View style={styles.search}><Ionicons name="search" size={19} color="#8f8a98"/><TextInput value={search} onChangeText={setSearch} placeholder="Search movies, shows and dramas" placeholderTextColor="#77717f" style={styles.input}/><Ionicons name="options-outline" size={20} color="#a9a1ae"/></View>
      <View style={styles.hero}><Image source={{ uri: posters[0][1] }} style={styles.heroImage}/><LinearGradient colors={['transparent','#0b090e']} style={StyleSheet.absoluteFill}/><LinearGradient colors={['rgba(10,8,13,0.02)','rgba(10,8,13,0.96)']} style={styles.heroFade}/><View style={styles.heroContent}><Text style={styles.kicker}>FEATURED TODAY</Text><Text style={styles.heroTitle}>Demon Slayer</Text><Text numberOfLines={2} style={styles.heroDesc}>The battle continues. Experience the latest story in cinematic quality.</Text><View style={styles.heroButtons}><Pressable style={styles.watch}><Ionicons name="play" size={17} color="#09070b"/><Text style={styles.watchText}>Watch now</Text></Pressable><Pressable style={styles.add}><Ionicons name="add" size={22} color="#fff"/></Pressable></View></View></View>
      <View style={styles.body}><PosterRow title="Continue Watching"/><PosterRow title="Trending Now"/><PosterRow title="Latest Movies"/><PosterRow title="Popular TV Shows" items={posters.slice().reverse()}/><PosterRow title="Drama Picks"/></View>
    </ScrollView>
    <View style={styles.nav}>{[['home','Home'],['compass','Explore'],['calendar','Schedule'],['bookmark','Library'],['person','Profile']].map(([icon,label]) => <Pressable key={label} onPress={() => setTab(label)} style={styles.navItem}><Ionicons name={(icon + (tab === label ? '' : '-outline')) as any} size={23} color={tab === label ? '#ff3d9a' : '#77727d'}/><Text style={[styles.navText, tab === label && styles.active]}>{label}</Text></Pressable>)}</View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ root:{flex:1,backgroundColor:'#0b090e'}, header:{paddingHorizontal:20,paddingTop:12,paddingBottom:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, brand:{fontSize:21,fontWeight:'900',letterSpacing:1.5,color:'#fff'},brandPink:{color:'#ff3d9a'},sub:{fontSize:9,color:'#7f7785',letterSpacing:2,marginTop:2},headerIcons:{flexDirection:'row',alignItems:'center',gap:17},avatar:{width:35,height:35,borderRadius:18,backgroundColor:'#ff3d9a',alignItems:'center',justifyContent:'center'},avatarText:{fontWeight:'800',color:'#120b10'},search:{marginHorizontal:20,height:46,borderRadius:14,backgroundColor:'#17141b',borderWidth:1,borderColor:'#25212a',flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:9},input:{flex:1,color:'#fff',fontSize:13},hero:{height:430,marginTop:14,position:'relative',overflow:'hidden'},heroImage:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%',resizeMode:'cover'},heroFade:{...StyleSheet.absoluteFillObject,top:'42%'},heroContent:{position:'absolute',left:20,right:20,bottom:22},kicker:{fontSize:10,color:'#ff3d9a',fontWeight:'800',letterSpacing:2},heroTitle:{fontSize:34,fontWeight:'900',color:'#fff',marginTop:5},heroDesc:{fontSize:13,color:'#c0bac5',lineHeight:19,maxWidth:330,marginTop:5},heroButtons:{flexDirection:'row',gap:10,marginTop:14},watch:{height:42,paddingHorizontal:18,borderRadius:12,backgroundColor:'#ff3d9a',flexDirection:'row',alignItems:'center',gap:7},watchText:{fontWeight:'800',fontSize:13},add:{height:42,width:44,borderRadius:12,backgroundColor:'#27222c',alignItems:'center',justifyContent:'center'},body:{paddingLeft:20,paddingTop:20},rowTitle:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingRight:20,marginBottom:11},section:{fontSize:19,fontWeight:'800',color:'#fff'},see:{fontSize:11,color:'#ff3d9a',fontWeight:'700'},card:{width:122,marginRight:12},poster:{width:122,height:174,borderRadius:10,backgroundColor:'#19161d'},cardTitle:{color:'#eee',fontSize:12,fontWeight:'700',marginTop:7},meta:{color:'#77717d',fontSize:10,marginTop:3},nav:{position:'absolute',bottom:0,left:0,right:0,height:82,backgroundColor:'#110e14',borderTopWidth:1,borderTopColor:'#27222b',flexDirection:'row',justifyContent:'space-around',paddingTop:9},navItem:{alignItems:'center',gap:3,minWidth:55},navText:{fontSize:9,color:'#77727d'},active:{color:'#ff3d9a',fontWeight:'800'}});
