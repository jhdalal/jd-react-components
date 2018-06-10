import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TweenMax, Power0, Power2, Power3 } from 'gsap';
import paperjs from 'paper';
import _ from 'lodash';
import ReactCSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';

import './path.css';

//const Draggable = window.Draggable;

class Path extends React.Component {

    static Point = Point;

    static defaultProps = {
        currentPointColor: '#cfcf36',
        shouldAnimate: true
    }

	componentDidMount() {

	}

	render() {

		return (
			<ReactCSSTransitionGroup
				component="div"
				className="path-list-transition"
				ref="monthListWrapper"
				transitionName="pathListAnim"
				transitionAppear={true}
				transitionAppearTimeout={750}
				transitionEnterTimeout={750}
				transitionLeaveTimeout={750}
			>
				{ //this.props.isReady &&
					<PathContainer {...this.props} />
				}
			</ReactCSSTransitionGroup>
		)
	}
}

class PathContainer extends Component {

	state = {
		hasInteracted: false,
		isDragging: false,
		dragCursor: false,
		pointerCursor: false,
		smoothing: {
			type: 'continuous',
		},
		pathColor: '#000000',
		indicatorPosition: {
			x: 0,
			y: 0,
		},
		pointSnap: []
    }

    points = React.Children.toArray(this.props.children).reduce((acc, curr, index) => {
        acc[curr.props.name] =  {
            id: index+1,
            name: curr.props.name
        };
        return acc;
    }, {});

	// Set monthlist/indicator position if arriving on month
	initialPosition = () => {

		const { monthListWrapper } = this.refs;
		const pointPosition = this.mainPath.segments[this.currentPointIndex].point.x;
		const vpw = window.innerWidth;
		const scrollPosition = pointPosition - (vpw / 2);

		monthListWrapper.scrollLeft = scrollPosition;
	}

	setDragging = (type) => {

		switch ( type ) {

			case 'drag-start' :
				this.setState({
					isDragging: true,
				});
			break;

			case 'drag-end' :
				this.setState({
					isDragging: false,
				});
			break;

			case 'dragging' :
				this.setState({
					dragCursor: true,
				});
			break;

			case 'not-dragging' :
				this.setState({
					dragCursor: false,
				});
			break;

			case 'moved' :
				this.setState({
					hasInteracted: true,
				});
			break;

			default :
				this.setState({
					isDragging: false,
					dragCursor: false,
				});
		}
	}

	movePathPoint = ( i, position, type ) => {

		let duration = 1;
		let easing = Power2.easeOut;

		// Types
		if (type) {

			switch (type) {

				case 'instant':
					duration = 0;
					easing = Power0.easeNone;
				break;

				default:
					duration = 1;
					easing = Power2.easeOut;
			}
        }
        
		// Kill current tweens
		const currentTweens = TweenMax.getTweensOf([
			this.pointsList[i].pathPoint.position,
			this.mainPath.segments[i].point
		]);
		currentTweens.forEach( tween => tween.kill() );

		TweenMax.to(
			[
				this.pointsList[i].pathPoint.position,
				this.mainPath.segments[i].point
			],
			duration,
			{
				y: position,
				ease: easing,
				onUpdate: () => {
					this.mainPath.smooth(this.state.smoothing);
				}
			},
		);
	}

	// Finds closest two points to indicator
	getClosestPoints = (arr, target) => {

		function findClosestIndex(target, arr) {
			var curr = arr[0];
			var diff = Math.abs (target - curr);
			for (var val = 0; val < arr.length; val++) {
				var newdiff = Math.abs (target - arr[val]);
				if (newdiff < diff) {
					diff = newdiff;
					curr = arr[val];
				}
			}
			return _.indexOf(arr, curr);
		}

		const closestIndex = findClosestIndex(target, arr);
		const result = [ _.indexOf(arr, arr[closestIndex]) ];

		if (_.isNumber(arr[closestIndex - 1]) && _.isNumber(arr[closestIndex + 1])) {
			if (Math.abs(target - arr[closestIndex - 1]) < Math.abs(target - arr[closestIndex + 1])) {
				result.push(_.indexOf(arr, arr[closestIndex - 1]));
			} else {
				result.push(_.indexOf(arr, arr[closestIndex + 1]));
			}
		}

		return result;
	}

	handleDrag = (e) => {

		const paper = this.paper;

		const draggedTo = e.x;

		// store x points and find the closest two
		const xPoints = this.pointsList.map( point => (point.pathPoint && point.pathPoint.position.x) || point.point.x );

		const closestIndex = this.getClosestPoints(xPoints, draggedTo);

		// Don't do anything if goes off the end
		if ( closestIndex.length === 2 ) {

			const closest = {
				point: this.pointsList[closestIndex[0]],
				x: xPoints[closestIndex[0]],
				index: closestIndex[0],
			};

			const nextClosest = {
				point: this.pointsList[closestIndex[1]],
				x: xPoints[closestIndex[1]],
				index: closestIndex[1],
			};

			// Determine how close for 'amplitude'
			closest.amplitude = Math.abs( ( nextClosest.x - draggedTo ) / ( closest.x - nextClosest.x ) );
			nextClosest.amplitude = 1 - closest.amplitude;
			const pathDifference = this.pathCenter - this.pathTop;

			// Move two points cloest in wave (make sure they are path points)
			if ( closest.point.pathPoint ) {
				this.movePathPoint( closest.index, this.pathCenter - (pathDifference * closest.amplitude), 'instant' );
				this.pointsList[closest.index].pathLabel.fillColor = this.props.currentPointColor;
			}
			if ( nextClosest.point.pathPoint ) {
				this.movePathPoint( nextClosest.index, this.pathCenter - (pathDifference * nextClosest.amplitude), 'instant' );
				this.pointsList[nextClosest.index].pathLabel.fillColor = this.state.pathColor;
			}

			// Enure 'missed' points are reset to bottom (on fast flick)
			this.pointsList.forEach( (point, i) => {
				if ( point.pathPoint && (i !== closest.index ) && (i !== nextClosest.index)  ) {
					this.movePathPoint( i, this.pathCenter, 'instant' );
					this.pointsList[i].pathLabel.fillColor = this.state.pathColor;
				}
			});

			// Keep indicator on path
			const draggedToPoint = new paper.Point(e.x, e.y);
			var nearestPathPoint = this.mainPath.getNearestPoint(draggedToPoint);
			this.setState({
				indicatorPosition: {
					x: this.state.indicatorPosition.x,
					y: nearestPathPoint.y,
				},
			});
		}
	}

	handleDragEnd = (e) => {

		const draggedTo = e.x;

		// store x points and find the closest two
		const xPoints = this.pointsList.map( point => (point.pathPoint && point.pathPoint.position.x) || point.point.x );

		const closestIndex = this.getClosestPoints(xPoints, draggedTo);

		const newPointIndex = closestIndex[0];

        const newPointName = _.find(this.state.points, point => point.id === newPointIndex).name;
        
        //console.log("SP::", this.state.points, " NPN::", newPointName);

		this.initializePath.pointChange(this.state.points[newPointName].id, true);
		this.currentPointIndex = this.state.points[newPointName].id;
		this.props.pointClick(null, newPointName);
	}

	handlePointChange = (name) => {

		if( this.initializePath.pointChange ) {

			this.initializePath.pointChange(this.points[name].id);
        }

		this.currentPointIndex = this.points[name].id;
	}

	animateLabel = (direction = 'in', newPointIndex, instant) => {

		const duration = instant ? 0.01 : 1;

		// Text color
		const currentColor = this.pointsList[newPointIndex].pathLabel.fillColor.toCSS(true);
		const labelColor = { value: (direction === 'in') ? this.state.pathColor : this.props.currentPointColor };
		const colorTo = (direction === 'in') ? this.props.currentPointColor : this.state.pathColor;

		if ( currentColor !== colorTo ) {

			TweenMax.to(labelColor, duration,
				{
					colorProps: {value: colorTo},
					ease: Power3.easeOut,
					onUpdate: () => {

						// Set color
						this.pointsList[newPointIndex].pathLabel.fillColor = labelColor.value;
					}
				}
			);
		}
	}

	initializePath = () => {

		const paper = this.paper;
		const view = paper.view;
        this.pointsList = [];
        const noOfPoints = Object.keys(this.points).length+1;

		// Get Point for given index
		const getPoint = (i) => {

			let x = this.viewWidth / noOfPoints * i;
			const point = new paper.Point(x, this.viewCenter.y);

			return point;
		}

		// Calculate dimensions
		const getDimensions = () => {

			this.pathCenter = view.center.y;
			this.pathTop = view.bounds.top + 20;
			this.pathBottom = this.pathCenter + 5;
			this.viewHeight = view.size.height;
			this.viewCenter = view.center;
			this.viewWidth = view.size.width;
		}
		getDimensions();

		// Main path
		this.mainPath = new paper.Path({
			strokeColor: this.state.pathColor,
			strokeWidth: 1,
			opacity: 0.65,
		});

		// Move indicator on click of month
		const pointClick = (e) => {

			if(! this.state.isDragging) {

				this.setState({
					hasInteracted: true,
				});

				const i = e.target.dataPointID;

                this.initializePath.pointChange(i);
                if (this.props.pointClick) {
                    this.props.pointClick(e, e.target.dataPointName);
                }
			}
		}

		// Hover in on mouse over month
		const pointEnter = (e) => {

			const i = e.target.dataPointID;

			if ( ! this.state.isDragging && ( i !== this.currentPointIndex ) && this.props.shouldAnimate ) {

				this.setState({
					pointerCursor: true,
				});

				// Hovered Point
				this.movePathPoint(i, this.pathTop + (this.viewHeight * 0.15), 'hoverIn');

				// Side Points
				if ( i+1 !== this.currentPointIndex && this.pointsList[i+1].pathPoint ) {
					this.movePathPoint(i+1, this.pathBottom, 'hoverIn');
				}
				if ( i-1 !== this.currentPointIndex && this.pointsList[i-1].pathPoint ) {
					this.movePathPoint(i-1, this.pathBottom, 'hoverIn');
				}
			}
		}

		// Hover out on mouse leave month
		const pointLeave = (e) => {

			if ( ! this.state.isDragging && this.props.shouldAnimate ) {

				this.setState({
					pointerCursor: false,
				});

				const i = e.target.dataPointID;

				// Hovered Point
				if ( i !== this.currentPointIndex) {
					this.movePathPoint(i, this.pathCenter, 'hoverOut');
				}

				// Side Points
				if ( i+1 !== this.currentPointIndex && this.pointsList[i+1].pathPoint ) {
					this.movePathPoint(i+1, this.pathCenter, 'hoverOut');
				}
				if ( i-1 !== this.currentPointIndex && this.pointsList[i-1].pathPoint ) {
					this.movePathPoint(i-1, this.pathCenter, 'hoverOut');
				}
			}
        }

		// Add path and month points
		for (let i = 0; i <= noOfPoints; i++) {

			// Path point
			const point = getPoint(i);
			this.mainPath.add(point);

			let pathPoint, pathLabel, clickTarget;

			// Add month points
			if( i !== 0 && i !== noOfPoints ) {

				const points = Object.keys(this.points);

				// Rectangle
				pathPoint = new paper.Path.Circle({
					radius: 3,
					fillColor: this.state.pathColor,
					name: 'pathPoint',
				});

				// Text
				pathLabel = new paper.PointText({
					fillColor: this.state.pathColor,
					fontFamily: 'URWGeometric-Regular',
					fontWeight: 700,
					justification: 'center',
					name: 'pathLabel',
                });
                
				// Target faux element for click target
				clickTarget = new paper.Path.Rectangle({
					dataPointID: i,
					dataPointName: points[i-1],
					size: {
						width: 1,
						height: 1
					},
					fillColor: 'red',
					name: 'clickTarget',
					opacity: 0,
					onClick: pointClick,
					onMouseEnter: pointEnter,
					onMouseLeave: pointLeave,
				});
			}

			// Store to update
			this.pointsList.push({
				point: point,
				pathPoint: pathPoint,
				pathLabel: pathLabel,
				clickTarget: clickTarget,
			});
        }
        
		// Change month animation - `instant` is used on page load
		const indicatorOffset = { value: 0 };
		this.initializePath.pointChange = (newPointIndex, instant) => {

			const oldPointIndex = this.currentPointIndex;
			let duration = instant ? 0.01 : 1;
			const moveType = instant ? 'instant' : 'pointChange';

			// Wave & text
			if ( newPointIndex === oldPointIndex ) {

				this.movePathPoint(newPointIndex, this.pathTop, moveType);
				this.animateLabel('in', newPointIndex, instant);

			} else {

				this.movePathPoint(oldPointIndex, this.pathCenter, moveType);
				this.movePathPoint(newPointIndex, this.pathTop, moveType);

				this.animateLabel('out', oldPointIndex, instant);
				this.animateLabel('in', newPointIndex, instant);
			}

			// Indicator offset animation
			const newOffset = this.mainPath.getOffsetOf(this.mainPath.segments[newPointIndex].point);
			const indicatorOffsetTween = TweenMax.to(indicatorOffset, duration,
				{
					value: newOffset,
					ease: Power2.easeOut,
					onUpdate: () => {

						// Update tween value during animation, as the position changes as the path moves
						indicatorOffsetTween.updateTo({ value: newOffset });

						// Set position
						this.setState({
							indicatorPosition: this.mainPath.getPointAt(indicatorOffset.value),
						});
					}
				}
			);

			// Move indicator to middle of screen
			const { monthListWrapper } = this.refs;
			const vpw = window.innerWidth;
			const scrollPosition = newOffset - (vpw / 2);
			duration = ( newPointIndex === oldPointIndex ) ? 0.01 : 1;
			TweenMax.to(monthListWrapper, 1,
				{
					scrollLeft: scrollPosition,
					ease: Power2.easeOut,
				}
			);
		}

		// Resize
		view.onResize = () => {

			getDimensions();

			// Reset
			this.mainPath.removeSegments();

			// Path points positions
			for (let i = 0; i <= noOfPoints; i++) {

				const point = getPoint(i);
                this.mainPath.add(point);
                
				if( this.pointsList[i].pathPoint ) {

					var clickTarget_scaleX = (this.viewWidth / noOfPoints)/this.pointsList[i].clickTarget.bounds.width;
    			    var clickTarget_scaleY = this.viewHeight/this.pointsList[i].clickTarget.bounds.height;
					this.pointsList[i].clickTarget.scale(clickTarget_scaleX, clickTarget_scaleY);

					this.pointsList[i].clickTarget.position = point;
					this.pointsList[i].clickTarget.position.y += 5;
					this.pointsList[i].pathPoint.position = point;
					this.pointsList[i].pathLabel.position = point;
					this.pointsList[i].pathLabel.content = _.find(this.state.points, point => point.id === i).name;
					this.pointsList[i].pathLabel.fontSize = (this.viewHeight < 100) ? 14 : 17;
					this.pointsList[i].pathLabel.position.y += (this.viewHeight < 100) ? 22 : 35;
				}
			}

			// Month snap (draggable)
			let pointSnap = this.pointsList.map( point => point.pathPoint && point.pathPoint.position.x );
			pointSnap = _.without(pointSnap, undefined);
			this.setState({
				pointSnap,
			});

			// Keep indicator in position
			this.initializePath.pointChange(this.currentPointIndex, true);

			// Smooth path
			this.mainPath.smooth(this.state.smoothing);
		}

		// Trigger resize
		view.emit('resize');

		// Fix half pixel blur
		view.translate(0.5,0.5);
	}

	componentWillMount() {

		this.paper = new paperjs.PaperScope();

		this.setState({
		    points: this.points,
			allowMouseMove: true,
			paperReady: false
		});
	}

	componentDidMount() {

		const canvas = this.refs.monthListCanvas;

		this.paper.setup(canvas);
		this.setState({
			paperReady: true
		}, () => {
			this.initializePath();
			this.initialPosition();
        });
        
		this.handlePointChange(this.props.currentPoint);
	}

	componentDidUpdate(prevProps) {
        //console.log("cDU::", prevProps.currentPoint, this.props.currentPoint);
		// Update month
		if( ! _.isEqual(prevProps.currentPoint,this.props.currentPoint) ) {
            //console.log("handlePointChangeFired::", this.props.currentPoint);
			this.handlePointChange(this.props.currentPoint);
		}
	}

	componentWillUnmount() {

		// Clear event handlers
		for (let i = 0; i <= this.points.length; i++) {

			if( this.pointsList[i].pathPoint ) {
				this.pointsList[i].clickTarget.onMouseEnter = null;
				this.pointsList[i].clickTarget.onMouseLeave = null;
			}
		}
	}

	render() {

		return (
			<div className={`path-list-wrapper hasInteracted-${this.state.hasInteracted}`} ref="monthListWrapper">

				{/* { !this.state.hasInteracted &&
					<DragInstruction />
				} */}

				<div className='path-list'>
					<Indicator
						indicatorPosition={this.state.indicatorPosition}
						pointSnap={this.state.pointSnap}
						handleDrag={this.handleDrag}
						handleDragEnd={this.handleDragEnd}
						setDragging={this.setDragging}
						dragCursor={this.state.dragCursor}
						viewWidth={this.viewWidth}
						viewHeight={this.viewHeight}
					/>

					<canvas className={`path-list-canvas ${(this.state.pointerCursor ? 'pointer' : 'not-pointer')} ${(this.state.dragCursor ? 'dragging' : 'not-dragging')} `} ref="monthListCanvas" data-paper-resize="true"></canvas>

				</div>
			</div>
		)
	}
}

class Indicator extends React.Component {

	updateSize = () => {

		// this.draggable[0].kill();
		// this.initDraggable();
	}

	// initDraggable = () => {

	// 	const indicator = this.refs.indicator;

	// 	const that = this;

	// 	// Autoscroll size
	// 	let autoScrollSize;
	// 	const screenWidth = this.props.viewWidth / 2;
	// 	if ( screenWidth >= 1200 ) {
	// 		autoScrollSize = 250;
	// 	} else if ( screenWidth >= 500 ) {
	// 		autoScrollSize = 100;
	// 	} else {
	// 		autoScrollSize = 50;
	// 	}

	// 	this.draggable = Draggable.create(indicator, {
	// 		bounds: '.path-list',
	// 		type: 'left',
	// 		lockAxis: true,
	// 		throwProps: true,
	// 		throwResistance: 9999,
	// 		snap: this.props.pointSnap,
	// 		cursor: null,
	// 		autoScroll: 1.35,
	// 		autoScrollMarginRight: autoScrollSize,
	// 		autoScrollMarginLeft: autoScrollSize,
	// 		autoScrollMarginTop: 0,
	// 		autoScrollMarginBottom: 0,
	// 		onPress: () => {
	// 			this.props.setDragging('drag-start');
	// 			this.props.setDragging('dragging');
	// 		},
	// 		onRelease: () => {
	// 			this.props.setDragging('not-dragging');
	// 		},
	// 		onDrag: function(){
	// 			that.props.setDragging('moved');
	// 			that.props.handleDrag(this);
	// 		},
	// 		onThrowUpdate: function(){
	// 			that.props.handleDrag(this);
	// 		},
	// 		onThrowComplete: function(){
	// 			that.props.handleDragEnd(this);
	// 			that.props.setDragging('drag-end');
	// 		},
	// 	});
	// }

	componentDidMount() {

		// this.initDraggable();
	}

	componentDidUpdate(prevProps) {

		if ( prevProps.pointSnap !== this.props.pointSnap ) {
			// if ( this.draggable && this.draggable.length > 0 ) {
			// 	this.draggable[0].vars.snap = this.props.pointSnap;
			// }
		}

		if ( prevProps.viewWidth !== this.props.viewWidth ) {
			this.updateSize();
		}
	}

	render() {
		return (
			<div ref="indicator" className={`path-list-indicator ${(this.props.dragCursor ? 'dragging' : 'not-dragging')}`}  style={{left: this.props.indicatorPosition.x, top: this.props.indicatorPosition.y}}>
				<div className="inner-circle"></div>
				<div className="outer-circle"></div>
				<div className="point"></div>
			</div>
		)
	}
}

// const DragInstruction = () => {
// 	return (
// 		<div className="drag-instruction">drag to view more</div>
// 	)
// };

export const Point = ({name}) => "";

Point.propTypes = {
    name: PropTypes.string.isRequired
}
 
Path.propTypes = {
    /** Point to be selected as default */
    currentPoint: PropTypes.string.isRequired,
    /** Point color hex string */
    currentPointColor: PropTypes.string,
    /** Callback to execute when a point is clicked */
    pointClick: PropTypes.func,
    /** To enable animations or not */
    shouldAnimate: PropTypes.bool
}

export default Path;