
export type MessageType = 'loadWebComponent' | 'restoreWebComponent' | 'saveSession' | 'webComponentReflectionInfo' | 'saveData';


export interface Message {
	type: MessageType;
	data: any;
}

export interface DocEntry {
	name?: string,
	value?: string,
	fileName?: string,
	documentation?: string,
	type?: string,
	constructors?: DocEntry[],
	parameters?: DocEntry[],
	decorators?: DocEntry[],
	returnType?: string


};


export interface SavedSession {
	currentData: any;
	indexSelected: number;
	infos: LitElementTypeReflection[];
}


export interface LitElementProperty {
	fieldName: string;
	type: (string | LitElementTypeReflection);
}

export interface LitElementTypeReflection {
	className: string;
	customElementName: string;

	properties: LitElementProperty[];
}



export function toObject(element: LitElementTypeReflection, obj = {}, overwrite = true) {
	element.properties.forEach((property) => {
		switch (property.type) {
            case 'String':
            case 'string':
				if(!overwrite && obj[property.fieldName]) {
					break;
				}
				obj[property.fieldName] = '';
				break;
            case 'Boolean':
            case 'boolean':
				obj[property.fieldName] = false;
				break;
            case 'Number':
            case 'number':
				obj[property.fieldName] = 0;
				break;
            case 'Array':
			case 'array':
				obj[property.fieldName] = [];
				break;
            default:
                if (typeof property.type === 'object') {
					let newObj: any;
					if(!overwrite && obj[property.fieldName]) {
						newObj = obj[property.fieldName];
					} else {
						newObj = {};
					}
					obj[property.fieldName] = toObject(property.type as any, newObj, overwrite);
                }
                break;
        }
	});
	return obj;
}

