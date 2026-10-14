plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.kasane.shell"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.kasane.shell"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets {
        getByName("main") {
            assets.srcDirs("src/main/assets")
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Open Source Root Community Tools (GitHub):
    // 1. topjohnwu libsu (standard Android root shell library by John Wu)
    implementation("com.github.topjohnwu.libsu:core:5.2.2")
    
    // 2. scottyab rootbeer (industry standard root detection verification library)
    implementation("com.scottyab:rootbeer-lib:0.1.0")
}
