// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Dimensions, Platform, StyleSheet} from 'react-native';
import PropTypes from 'prop-types';
import {CalendarList, LocaleConfig} from 'react-native-calendars';
import {intlShape} from 'react-intl';

import {memoizeResult} from '@mm-redux/utils/helpers';

import {DATE_MENTION_SEARCH_REGEX, ALL_SEARCH_FLAGS_REGEX} from 'app/constants/autocomplete';
import {changeOpacity} from 'app/utils/theme';

export default class DateSuggestion extends PureComponent {
    static propTypes = {
        cursorPosition: PropTypes.number.isRequired,
        locale: PropTypes.string.isRequired,
        matchTerm: PropTypes.string,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
        enableDateSuggestion: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        value: '',
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            mentionComplete: false,
            sections: [],
        };
    }

    componentDidMount() {
        this.setCalendarLocale();
    }

    componentDidUpdate(prevProps) {
        const {locale, matchTerm} = this.props;

        if ((matchTerm !== prevProps.matchTerm && matchTerm === null) || this.state.mentionComplete) {
            this.resetComponent();
        }

        if (locale !== prevProps.locale) {
            this.setCalendarLocale();
        }
    }

    completeMention = (day) => {
        const mention = day.dateString;
        const {cursorPosition, onChangeText, value} = this.props;

        // Substring to first space after current cursor position.
        // If there is none, cursor is at the end of the date segment already.
        let dateSegmentEnd = value.indexOf(' ', cursorPosition);
        if (dateSegmentEnd === -1) {
            dateSegmentEnd = cursorPosition;
        }
        const mentionPart = value.substring(0, dateSegmentEnd);

        const flags = mentionPart.match(ALL_SEARCH_FLAGS_REGEX);
        const currentFlag = flags[flags.length - 1];
        let completedDraft = mentionPart.replace(DATE_MENTION_SEARCH_REGEX, `${currentFlag} ${mention} `);

        if (value.length > dateSegmentEnd) {
            completedDraft += value.substring(dateSegmentEnd + 1); // accounting for extra space character
        }

        onChangeText(completedDraft, true);
        this.props.onResultCountChange(1);
        this.setState({mentionComplete: true});
    };

    resetComponent() {
        this.setState({
            mentionComplete: false,
            sections: [],
        });

        this.props.onResultCountChange(0);
    }

    setCalendarLocale = () => {
        const {locale} = this.props;
        const {formatMessage} = this.context.intl;

        LocaleConfig.locales[locale] = {
            monthNames: formatMessage({
                id: 'mobile.calendar.monthNames',
                defaultMessage: 'January,February,March,April,May,June,July,August,September,October,November,December',
            }).split(','),
            monthNamesShort: formatMessage({
                id: 'mobile.calendar.monthNamesShort',
                defaultMessage: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
            }).split(','),
            dayNames: formatMessage({
                id: 'mobile.calendar.dayNames',
                defaultMessage: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
            }).split(','),
            dayNamesShort: formatMessage({
                id: 'mobile.calendar.dayNamesShort',
                defaultMessage: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
            }).split(','),
        };

        LocaleConfig.defaultLocale = locale;
    };

    render() {
        const {mentionComplete} = this.state;
        const {matchTerm, enableDateSuggestion, theme} = this.props;

        if (matchTerm === null || mentionComplete || !enableDateSuggestion) {
            // If we are not in an active state or the mention has been completed return null so nothing is rendered
            // other components are not blocked.
            return null;
        }

        const currentDate = (new Date()).toDateString();
        const calendarStyle = calendarTheme(theme);

        return (
            <CalendarList
                style={styles.calList}
                current={currentDate}
                maxDate={currentDate}
                pastScrollRange={24}
                futureScrollRange={0}
                scrollingEnabled={true}
                pagingEnabled={true}
                hideArrows={false}
                horizontal={true}
                showScrollIndicator={true}
                onDayPress={this.completeMention}
                showWeekNumbers={false}
                theme={calendarStyle}
                keyboardShouldPersistTaps='always'
            />
        );
    }
}

const getDateFontSize = () => {
    let fontSize = 14;

    if (Platform.OS === 'ios') {
        const {height, width} = Dimensions.get('window');
        if (height < 375 || width < 375) {
            fontSize = 13;
        }
    }

    return fontSize;
};

const calendarTheme = memoizeResult((theme) => ({
    arrowHeight: Platform.select({ios: 13, android: 26}),
    arrowWidth: Platform.select({ios: 8, android: 22}),
    calendarBackground: theme.centerChannelBg,
    monthTextColor: changeOpacity(theme.centerChannelColor, 0.8),
    dayTextColor: theme.centerChannelColor,
    textSectionTitleColor: changeOpacity(theme.centerChannelColor, 0.25),
    'stylesheet.day.basic': {
        base: {
            width: 22,
            height: 22,
            alignItems: 'center',
        },
        text: {
            marginTop: 0,
            fontSize: getDateFontSize(),
            fontWeight: '300',
            color: theme.centerChannelColor,
            backgroundColor: 'rgba(255, 255, 255, 0)',
            lineHeight: 23,
        },
        today: {
            backgroundColor: theme.buttonBg,
            width: 24,
            height: 24,
            borderRadius: 12,
        },
        todayText: {
            color: theme.buttonColor,
        },
    },
}));

const styles = StyleSheet.create({
    calList: {
        height: 1700,
        paddingTop: 5,
    },
});
