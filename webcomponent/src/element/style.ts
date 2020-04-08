import { css, CSSResult, LitElement } from "lit-element";




export function getBaseStyle(): CSSResult {
    return css`
    .container-center {
        display: flex;
        justify-content: center;
        align-items: center
    }

    .column {
        flex-direction: column;
    }

    .row {
        flex-direction: row;
    }

    .card {
        box-shadow: 1px;
    }

    .full {
        height: 100%;
        width: 100%;
    }
    
    `;
}


export class BaseCSSStyle extends LitElement {

    getStyles() {
        return getBaseStyle();
    }
}