import React, { useState, useMemo } from 'react';
import type { DriverOperatorData } from '../types';

interface DesignationSummaryProps {
  data: DriverOperatorData[];
  onDesignationClick?: (designation: string) => void;
}

interface DesignationCount {
  designation: string;
  count: number;
}

const getDesignation = (item: DriverOperatorData): string | undefined => {
    const anyItem = item as any;
    return anyItem.DESIGNATION ?? anyItem.Designation;
};

// --- START: Flowchart Components ---

// Main Gold Node
const PrimaryNode: React.FC<{ title: string; count: number; direction: 'left' | 'right'; onClick?: () => void }> = ({ title, count, direction, onClick }) => {
    const shapeClass = direction === 'left' 
        ? 'rounded-l-full rounded-r-2xl' // For node on the right, points left
        : 'rounded-r-full rounded-l-2xl'; // For node on the left, points right

    return (
        <div
            onClick={onClick}
            style={{ textShadow: '0 0 8px rgba(224, 0, 224, 0.7)' }}
            className={`bg-[#D86DCD] text-black w-48 h-16 flex flex-col items-center justify-center font-display text-2xl shadow-lg ${shapeClass} ${onClick ? 'cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_15px_rgba(0,0,0,0.8)]' : ''}`}
        >
            <span>{title}</span>
            <span className="text-sm">({count})</span>
        </div>
    );
};

// Secondary Magenta Node
const SecondaryNode: React.FC<{ title: string; count: number; onClick?: () => void }> = ({ title, count, onClick }) => (
  <div
    onClick={onClick}
    className="bg-mute-pink text-white w-40 h-16 flex flex-col items-center justify-center font-sans rounded-2xl shadow-md cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_15px_rgba(0,0,0,0.8)]"
    style={{ textShadow: '0 0 8px rgba(224, 0, 224, 0.9)' }}
  >
    <span className="font-bold text-sm text-center px-1">{title}</span>
    <span className="text-lg font-bold">({count})</span>
  </div>
);


const DesignationSummary: React.FC<DesignationSummaryProps> = ({ data, onDesignationClick }) => {
    const [isDriversExpanded, setIsDriversExpanded] = useState(false);
    const [isOperatorsExpanded, setIsOperatorsExpanded] = useState(false);
    
    const handleOperatorsClick = () => {
        const nextState = !isOperatorsExpanded;
        setIsOperatorsExpanded(nextState);
        if (nextState) { // If expanding operators, collapse drivers.
            setIsDriversExpanded(false);
        }
    };

    const handleDriversClick = () => {
        const nextState = !isDriversExpanded;
        setIsDriversExpanded(nextState);
        if (nextState) { // If expanding drivers, collapse operators.
            setIsOperatorsExpanded(false);
        }
    };

    const { drivers, operators, totalDrivers, totalOperators } = useMemo(() => {
        const counts = new Map<string, number>();
        if (!data) return { drivers: [], operators: [], totalDrivers: 0, totalOperators: 0 };

        data.forEach(item => {
            // Standardize to uppercase to handle any potential inconsistencies in source data
            // and match the user's requirement for uppercase display.
            const designation = getDesignation(item)?.trim().toUpperCase();
            if (designation) {
                counts.set(designation, (counts.get(designation) || 0) + 1);
            }
        });

        const driverList: DesignationCount[] = [];
        const operatorList: DesignationCount[] = [];
        // Use uppercase strings to match the standardized designations.
        const driverDesignations = ['HEAVY DRIVER', 'LIGHT DRIVER'];

        for (const [designation, count] of counts.entries()) {
            if (driverDesignations.includes(designation)) {
                driverList.push({ designation, count });
            } else {
                operatorList.push({ designation, count });
            }
        }
        
        const finalDrivers = driverDesignations.map(d => {
           const found = driverList.find(dr => dr.designation === d);
           return found || { designation: d, count: 0 };
        });
        
        const currentTotalDrivers = finalDrivers.reduce((sum, d) => sum + d.count, 0);
        const currentTotalOperators = operatorList.reduce((sum, o) => sum + o.count, 0);

        return { 
            drivers: finalDrivers, 
            operators: operatorList.sort((a,b) => a.designation.localeCompare(b.designation)),
            totalDrivers: currentTotalDrivers,
            totalOperators: currentTotalOperators
        };
    }, [data]);

    // This component holds the expandable nodes and their connectors
    const ExpandableBranch: React.FC<{
        isExpanded: boolean;
        nodes: DesignationCount[];
        direction: 'left' | 'right';
    }> = ({ isExpanded, nodes, direction }) => {
        const connectorColor = '#C1910F';
        // Adjust padding based on direction to make space for the first connector piece
        const paddingClass = direction === 'left' ? 'pl-10' : 'pr-10';

        return (
            <div className={`transition-all duration-500 ease-in-out grid ${isExpanded ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className={`relative ${paddingClass}`}>
                        {/* Horizontal Bus Line */}
                        {nodes.length > 0 && (
                            <div
                                className="absolute top-1/2 -translate-y-1/2 h-0.5"
                                style={{
                                    backgroundColor: connectorColor,
                                    // Position the line from the edge of the container
                                    ...(direction === 'left' ? { left: 0 } : { right: 0 }),
                                    width: '100%',
                                }}
                            />
                        )}

                        <div className="flex flex-row gap-4">
                            {nodes.map((node) => (
                                <div key={node.designation} className="relative pt-10">
                                    {/* Vertical Drop Line */}
                                    <div
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-10"
                                        style={{ backgroundColor: connectorColor }}
                                    />
                                    <SecondaryNode 
                                        title={node.designation} 
                                        count={node.count} 
                                        onClick={onDesignationClick ? () => onDesignationClick(node.designation) : undefined}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-secondary p-8 rounded-xl shadow-lg min-h-[250px] overflow-x-auto">
            <div className="flex items-start justify-between min-w-max">
            
                {/* Operators Branch (Flows Left to Right) */}
                <div className="flex items-center">
                    <PrimaryNode 
                        title="Operators" 
                        count={totalOperators} 
                        direction="right" 
                        onClick={handleOperatorsClick} 
                    />
                    <ExpandableBranch isExpanded={isOperatorsExpanded} nodes={operators} direction="left" />
                </div>

                {/* Drivers Branch (Flows Right to Left) */}
                <div className="flex items-center">
                    <ExpandableBranch isExpanded={isDriversExpanded} nodes={drivers} direction="right" />
                    <PrimaryNode 
                        title="Drivers" 
                        count={totalDrivers} 
                        direction="left" 
                        onClick={handleDriversClick} 
                    />
                </div>
            </div>
        </div>
    );
};

export default DesignationSummary;