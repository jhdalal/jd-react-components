import React from 'react';
import Path from 'jd-react-components/Path';

// Months
const months = {
	'january': {
		id: 1,
		name: 'January',
		shortname: 'Jan',
	},
	'february': {
		id: 2,
		name: 'February',
		shortname: 'Feb',
	},
	'march': {
		id: 3,
		name: 'March',
		shortname: 'Mar',
	},
	'april': {
		id: 4,
		name: 'April',
		shortname: 'Apr',
	},
	'may': {
		id: 5,
		name: 'May',
		shortname: 'May',
	},
	'june': {
		id: 6,
		name: 'June',
		shortname: 'Jun',
	},
	'july': {
		id: 7,
		name: 'July',
		shortname: 'Jul',
	},
	'august': {
		id: 8,
		name: 'August',
		shortname: 'Aug',
	},
	'september': {
		id: 9,
		name: 'September',
		shortname: 'Sep',
	},
	'october': {
		id: 10,
		name: 'October',
		shortname: 'Oct',
	},
	'november': {
		id: 11,
		name: 'November',
		shortname: 'Nov',
	},
	'december': {
		id: 12,
		name: 'December',
		shortname: 'Dec',
	}
};

/** Month timeline */
export default class ExampleCalendarMonths extends React.Component {

    state = {
        currentMonth: 'January'
    }

    goToMonth = (e, key) => {
		e && e.preventDefault();
		console.info("goToMonth::", key);
		this.setState({currentMonth: key});
    };

    render(){
        return (
            <div>
                <Path currentPoint={this.state.currentMonth} pointClick={this.goToMonth}>
                    {
                        Object.values(months).map(m => {
                            return <Path.Point key={m.id} name={m.name}></Path.Point>;
                        })
                    }
                </Path>
            </div>
        );
    }
}