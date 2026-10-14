#!/bin/sh

# Standard Gradle Wrapper Script
DEFAULT_JVM_OPTS='"-Xmx64m" "-Xms64m"'

APP_BASE_NAME=`basename "$0"`
APP_HOME="`pwd -P`"

CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar

# Download wrapper jar if not present (cloud build safety fallback)
if [ ! -e "$CLASSPATH" ]; then
    mkdir -p "$APP_HOME/gradle/wrapper"
    echo "Downloading Gradle wrapper jar..."
    curl -sLo "$CLASSPATH" https://raw.githubusercontent.com/gradle/gradle/v8.4.0/gradle/wrapper/gradle-wrapper.jar || \
    wget -qO "$CLASSPATH" https://raw.githubusercontent.com/gradle/gradle/v8.4.0/gradle/wrapper/gradle-wrapper.jar || true
fi

# Locate JAVA_HOME
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
        JAVACMD="$JAVA_HOME/jre/sh/java"
    else
        JAVACMD="$JAVA_HOME/bin/java"
    fi
else
    JAVACMD="java"
fi

exec "$JAVACMD" "-Dorg.gradle.appname=$APP_BASE_NAME" -classpath "$CLASSPATH" org.gradle.wrapper.GradleWrapperMain "$@"
