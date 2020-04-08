
import { LitElement, customElement, html, css } from 'lit-element';
import { styleMap } from 'lit-html/directives/style-map';
import { LitElementTypeReflection, Message, LitElementProperty, toObject, } from '../view';
import '@polymer/paper-input/paper-input';

declare let acquireVsCodeApi: any;
let vscode: any;

@customElement('litelement-previewer')
export class LitElementPreviewerElement extends LitElement {

    static getStyles() {
        return css`
            :root {
                --themeColor: #1234
            };


            .card {
                background-color: white;
                padding: 15px;
            }

            .form-recursive {
                background-color: white;
            }

            .form-recursive div {
                padding-left: 0px;
            }
            .form-recursive div > div {
                padding-left: 15px;
            }
            .form-recursive div > div > div {
                padding-left: 20px;
            }
        `;
    }

    infos: LitElementTypeReflection[];
    indexSelected: number = -1;
    currentWebComponent: LitElement;
    container: HTMLElement;
    currentData: any;


    containerStyle = {};

    constructor() {
        super();

        window.addEventListener('message', (event) => {
            console.log('EVENT', event);
            const data = event.data as Message;
            switch (data.type) {
                case 'loadWebComponent':
                    console.log('LOAD WEB COMPONENT EVETN', event.data);
                    break;
                case 'restoreWebComponent':
                    this.currentData = data.data.currentData;
                    this.indexSelected = data.data.indexSelected;
                    this.infos = data.data.infos;
                    if (this.indexSelected > -1) {
                        this.onWSSelect(this.indexSelected);
                    }
                    this.requestUpdate();
                    break;
                case 'webComponentReflectionInfo':
                    console.log('REFLECTION INFO', event.data);
                    this.infos = data.data;
                    this.requestUpdate();
                    break;
                default:
                    console.log('EVENT NOT RECOGNIZE', event.type);
                    break;
            }

        });

    }


    onWSSelect(index: number) {
        this.indexSelected = index;
        const info = this.infos[index];
        if (!this.currentData) {
            this.currentData = toObject(info);
        } else {
            this.currentData = toObject(info,this.currentData, false);
        }
        console.log('DATA', this.currentData);
        console.log('CREATING ELEMENT', info.customElementName);
        this.currentWebComponent = document.createElement(info.customElementName) as LitElement;
        this.requestUpdate();
    }


    updateWC() {
        Object.entries(this.currentData).forEach(([k, v]) => {
            this.currentWebComponent[k] = v;
            console.log(this.currentWebComponent[k]);
        });
        this.backup();
        this.currentWebComponent.requestUpdate();
    }

    insertWC() {
        if (this.currentWebComponent) {
            this.container = this.shadowRoot.getElementById('container');
            if (this.container) {
                this.updateWC();
                this.container.append(this.currentWebComponent);
            } else {
                console.log('CONTAINER NOT FOUND');
            }
        } else {
            console.log('ERROR WC is not created');
        }
    }

    returnSelection() {
        this.container.removeChild(this.currentWebComponent);
        this.currentWebComponent = null
        this.container = null;
        this.requestUpdate();
    }

    renderSelection() {
        return html`
        <div>
            <h5>WebComponent trouvé</h5>
            <div>
                ${this.infos.map((i, index) => html`
                <div style="display: flex; flex-direction: column">
                    <button @click="${() => this.onWSSelect(index)}">${i.className}</button>
                </div>
                `)}
            </div>
        </div> 
        `;
    }

    renderPreview() {
        return html`
        <div>
            <div>
                <button @click="${() => this.returnSelection()}">Retour</button>
            
                <h5>${this.infos[this.indexSelected].className}</h5>
            </div>

            <div id="container" style="${styleMap(this.containerStyle)}">

            </div>

            ${this.renderLitElementControl()}

            ${this.renderPropertyForm()}
        </div>
        `;
    }


    renderLitElementControl() {
        return html`
            <div style="display: flex;flex-direction: row; justify-content: center">
                <div>
                    <button @click="${() => this.updateWC()}">RequestUpdate</button>
                    <button>Trigger Event</button>
                </div>
            </div>
        `;
    }

    onValueChange(event: any, property: LitElementProperty, savedObj: any) {
        console.log('EVENT VALUE CHANGE', event, savedObj);
        switch (property.type) {
            case 'string':
            case 'String':
                if (event.data) {
                    savedObj[property.fieldName] = savedObj[property.fieldName] + event.data;
                } else {
                    savedObj[property.fieldName] = (savedObj[property.fieldName] as string).substring(0, savedObj[property.fieldName].length - 1);
                }
        }
        console.log(this.currentData);
        this.updateWC();
    }

    backup() {
        if (!vscode) {
            vscode = acquireVsCodeApi();
        }

        vscode.postMessage({
            type: 'saveSession',
            data: {
                currentData: this.currentData,
                infos: this.infos,
                indexSelected: this.indexSelected
            }
        } as Message);
    }

    renderPropertyForm() {
        const info = this.infos[this.indexSelected];
        return html`
        <form style="display: flex; flex-direction: column;" class="form-recursive">

            ${this.renderType(info, this.currentData)}

        </form>
        `;
    }

    renderType(type: LitElementTypeReflection, savedObj: any) {
        return html`
            <div class="card">
                ${type.properties.map(x => this.renderPropertyFied(x, savedObj))}
            </div>
        `;
    }

    renderPropertyFied(property: LitElementProperty, savedObj: any) {
        switch (property.type) {
            case 'String':
            case 'string':
                return this.renderStringField(property, savedObj);
            case 'Boolean':
            case 'boolean':
                return this.renderBoolField(property);
            case 'Number':
            case 'number':
                return this.renderNumberField(property, savedObj);
            case 'Array':
            case 'array':
                return this.renderArrayField(property);
            default:
                if (typeof property.type === 'object') {
                    console.log('Object data', savedObj);
                    return this.renderType(property.type as any, savedObj[property.fieldName]);
                }
                return '';
        }
    }

    renderStringField(property: LitElementProperty, savedObj: any) {
        return html`
            <paper-input label="${property.fieldName}" value="${savedObj[property.fieldName]}" @input="${(e) => this.onValueChange(e, property, savedObj)}"></paper-input>
        `;
    }

    renderBoolField(property: LitElementProperty) {
        console.log(property);
    }

    renderNumberField(property: LitElementProperty, savedObj: any) {
        return html`
            <paper-input name="${property.fieldName}" value="${savedObj[property.fieldName]}" @change="${() => console.log('VALIE CAHNGE')}" label="${property.fieldName}" type="number"></paper-input>
        `;
    }

    renderArrayField(property: LitElementProperty) {
        console.log(property);
    }


    renderNoData() {
        return html`
        <div style="position: relative; min-height: 100%; display: flex; justify-content: center; align-items: center">
            No data receive
        </div>
        `;
    }

    render() {
        console.log('RENDERING', this.infos);
        const element = document.createElement('arcade-dashboard');
        console.log(element);
        if (this.currentWebComponent) {
            this.updateComplete.then(() => this.insertWC())
            return this.renderPreview();
        } else if (this.infos && this.infos.length > 0) {
            return this.renderSelection();
        }
        return this.renderNoData();
    }

}
