import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function NewPage() {
  const [toggles, setToggles] = useState({
    visual: true,
    audio: true,
    text: true,
  });

 const [toastMessage, setToastMessage] = useState("Adapting to Visual Mode");
 
 const handleToggle = (key: "visual" | "audio" | "text") => {
    setToggles(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        {/* Header Buttons */}
        <View style={styles.headerSection}>
          
          {/* Visual */}
          <Pressable
            style={toggles.visual ? styles.activeHeaderButton : styles.headerButton}
            onPress={() => handleToggle("visual")}
          >
            <Text style={toggles.visual ? styles.activeHeaderText : ""}>
              Visual
            </Text>
            {toggles.visual && <View style={styles.activeCircle} />}
          </Pressable>

          {/* Audio */}
          <Pressable
            style={toggles.audio ? styles.activeHeaderButton : styles.headerButton}
            onPress={() => handleToggle("audio")}
          >
            <Text style={toggles.audio ? styles.activeHeaderText : ""}>
              Audio
            </Text>
            {toggles.audio && <View style={styles.activeCircle} />}
          </Pressable>

          {/* Text */}
          <Pressable
            style={toggles.text ? styles.activeHeaderButton : styles.headerButton}
            onPress={() => handleToggle("text")}
          >
            <Text style={toggles.text ? styles.activeHeaderText : ""}>
              Text
            </Text>
            {toggles.text && <View style={styles.activeCircle} />}
          </Pressable>

        </View>

        <View style={styles.middleSection}>
            <View style={styles.videoContainer}></View>
            <View style={styles.rightSideContainer}>
                <View style={styles.toastModal}>
                    <View style={styles.toastImage}>
                    </View>
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
                <View style={styles.statisticsContainer}>
                    <Text style={styles.statTextLabel}>Reading Speed</Text>
                    <View style={styles.speedMeterImage}></View>

                    <Text style={styles.statTextLabel}>Attention</Text>
                    <View style={styles.attentionMeterImage}></View>

                    <Text style={styles.statTextLabel}>Engagement Score</Text>
                    <View style={styles.engagementBar}>
                        <View style={styles.engagementProgress}></View>
                    </View>
                    <Text style={styles.engagementPercentText}>85%</Text>
                    
                </View>
            </View>
        </View>
        <View style={styles.footerSection}>
            <View style={styles.playButton}></View>
            <View style={styles.prevButton}></View>
            <View style={styles.nextButton}></View>
            <View style={styles.playBackProgressBar}>
                <View style={styles.playBackBar}></View>
            </View>
            <Text style={styles.playBackSpeedText}>1.0x</Text>
            <View style={styles.bookMarkImage}></View>
        </View>
      </View>
    </View>
  );
}
const colors = {
  tealPrimary: "#2CC8A3",
  tealLight: "#7EEBD2",
  tealDark: "#21afa3",

  emerald: "#53DA7D",

  grayLight: "#F4F5F7",
  graySoft: "#DDE0E4",
  grayMedium: "#7E8083",
  grayDark: "#3F4347",

  mintGlow: "#B7F8E5",

  white: "#FFFFFF"
};



const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.grayLight,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  background: {
    backgroundColor: colors.white,
    width: "90%",
    height: "70%",
    borderRadius: 20,
    boxShadow: "0 4px 12px 0 rgba(0, 0, 0, .01)",
  },

  headerSection: {
    backgroundColor: colors.white,
    width: "100%",
    height: "12%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: "2%",
    boxShadow: "0 4px 12px 0 rgba(0, 0, 0, .05)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  activeHeaderButton: {
    backgroundColor: colors.tealDark,
    width: "27%",
    height: "50%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderRadius: 25,
  },

  headerButton: {
    backgroundColor: colors.graySoft,
    width: "25%",
    height: "50%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
  },

  activeCircle: {
    width: "31%",
    height: "78%",
    marginRight: "5%",
    backgroundColor: colors.white,
    borderRadius: 25,
  },

  activeHeaderText: {
    marginLeft: "20%",
    color: colors.white,
    flex: 1,
  },

  middleSection: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingHorizontal: "2%",
    width: "100%",
    height: "76%",
    zIndex: 2
  },

  videoContainer:{
    backgroundColor: colors.graySoft,
    width: "60%",
    marginRight: "2%",
    height: "100%",
  },

  rightSideContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: "38%",
    height: "105%",
    marginTop: "-7.5%", 
  },

  toastModal: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    width: "117%",
    height: "20%",
    paddingVertical: "3%",
    paddingHorizontal: "4.5%",
    borderRadius: 10,
    boxShadow: "0 4px 12px 0 rgba(0, 0, 0, .1)",
  },

  toastImage: {
    backgroundColor: colors.graySoft,
    width: "45%",
    height: "66%",
    marginBottom: "2%"
  },

  toastText: {
    color: colors.tealDark,
    fontSize: 12,
  },
  
  statisticsContainer: {
    backgroundColor: colors.white,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "73%",
    marginBottom: "5%",
    borderRadius: 10,
    boxShadow: "0 4px 12px 0 rgba(0, 0, 0, .1)",
  },

  statTextLabel: {
    color: colors.grayDark,
    marginBottom: "10%",
    fontSize: 13
  },

  speedMeterImage: {
    backgroundColor: colors.graySoft,
    width: "73%",
    height: "25%",
    borderRadius: 125,
    marginBottom: "10%"
  },

  attentionMeterImage: {
    backgroundColor: colors.graySoft,
    width: "73%",
    height: "25%",
    borderRadius: 125,
    marginBottom: "10%"
  },

  engagementBar: {
    backgroundColor: colors.graySoft,
    width: "85%",
    height: "1.5%",
    marginBottom: "10%",
    borderRadius: 10
  },
  
  engagementProgress: {
    backgroundColor: colors.emerald,
    width: "85%",
    height: "100%",
    borderRadius: 10
  },

  engagementPercentText: {
    color: colors.grayDark,
    fontSize: 13
  },

  footerSection: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    boxShadow: "0 -4px 12px 0 rgba(0, 0, 0, .05)",
    width: "100%",
    height: "12%",
    marginTop: "2%",
    paddingHorizontal: "3%",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  playButton:{
    backgroundColor: colors.graySoft,
    width: "10%",
    height: "45%",
    borderRadius: 100
  },

  prevButton: {
    backgroundColor: colors.graySoft,
    width: "8%",
    height: "40%",
    borderRadius: 100
  },

  nextButton: {
    backgroundColor: colors.graySoft,
    width: "8%",
    height: "40%",
    borderRadius: 100
  },

  playBackProgressBar:{
    backgroundColor: colors.graySoft,
    width: "38%",
    height: "5%",
    borderRadius: 10,
    marginHorizontal: "2%"
  },

  playBackBar:{
    backgroundColor: colors.emerald,
    width: "40%",
    height: "100%",
    borderRadius: 10
  },

  playBackSpeedText: {
    color: colors.grayDark,
    fontSize: 13
  },

   bookMarkImage: {
    backgroundColor: colors.graySoft,
    width: "8%",
    height: "50%",
    borderRadius: 100,
    marginLeft: "3%"
  },
});
