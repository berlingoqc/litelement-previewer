import * as path from 'path';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as ts from 'typescript';
import { readFileSync } from 'fs';


export interface Settings {
	moduleBuild: string;
	src: string[];
}

export interface Message {
	type: string;
	data: any;
}



const editor = vscode.window.activeTextEditor;

let settings: Settings = {
	moduleBuild: '',
	src: []
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


	const myScheme = 'lstyle';
	const myProvider = new class implements vscode.TextDocumentContentProvider {

		// emitter and its event
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		provideTextDocumentContent(uri: vscode.Uri): string {
			// simply invoke cowsay, use uri-path as text
			return 'SOME TEXT DUDRE';
		}
	}

	vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider);

	const i = readFileSync(path.join(vscode.workspace.rootPath ?? '', 'wc-preview.json'));
	settings = JSON.parse(i.toString());
	console.log(settings);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "webcomponent-preview" is now active!  i guesss');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('webcomponent-preview.open', async (uri: vscode.Uri) => {
		// The code you place here will be executed every time your command is executed
		const panel = vscode.window.createWebviewPanel(
			'webComponentPreview',
			'webComponentPreview',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
			}
		);

		const uriFile = vscode.Uri.file(path.join(vscode.workspace.rootPath ?? '', settings.moduleBuild));

		console.log(uriFile);

		panel.webview.html = getWebviewContent(context, panel.webview, uriFile, 1);


		panel.webview.onDidReceiveMessage((event: Message) => {
			switch (event.type) {
				case 'saveSession':
					console.log('saving session');
					context.workspaceState.update('data-wc', event.data).then(() => {
						console.log('SUCESS')
					});
					break;
			}
		});

		// const uriCss = vscode.Uri.parse('lstyle://' + 'caca');
		// const doc = await vscode.workspace.openTextDocument(uriCss);
		// await vscode.window.showTextDocument(doc, { preview: true })


		refreshTypeInfo(panel.webview);

		// Display a message box to the user
		vscode.window.showInformationMessage('Opening webComponent preview');

		const ppp = new vscode.RelativePattern(
			vscode.workspace.rootPath ?? '',
			'**/*'
		);
		const watcher = vscode.workspace.createFileSystemWatcher(
			ppp
		)
			;
		let i = 1;

		const handler = (e: any) => {
			if (e.path === uriFile.path) {
				panel.title = 'CACOUUU';
				i += 1;
				panel.webview.html = getWebviewContent(context, panel.webview, uriFile, i);

				const savedData = context.workspaceState.get('data-wc')
				console.log('SAVED DATA', savedData);

				panel.webview.postMessage({
					type: 'restoreWebComponent',
					data: savedData
				} as Message);

				refreshTypeInfo(panel.webview);
			}
		}
		watcher.onDidCreate(handler);
		watcher.onDidChange(handler);
	});

	context.subscriptions.push(disposable);
}

function refreshTypeInfo(webview: vscode.Webview) {
	(async () => {
		webview.postMessage({
			type: 'webComponentReflectionInfo',
			data: getElementTypeInfo(
				settings.src.map(s => path.join(vscode.workspace.rootPath ?? '', s))
			)
		});
	})();
}

// this method is called when your extension is deactivated
export function deactivate() { }

let i = 0;

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, fileToOpen: any = '', i: number): string {

	const text = editor?.document.getText(editor.selection);

	console.log('SELECTION', text);

	const scriptPathOnDisk = vscode.Uri.file(
		path.join(context.extensionPath, 'out', 'index.js')
	);

	i += 1;

	const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
	const srriptUriToLoad = webview.asWebviewUri(fileToOpen);
	return `
			<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <!--
                Use a content security policy to only allow loading images from https or from our extension directory,
                and only allow scripts that have a specific nonce.
                -->
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Cat Coding</title>
				<script type="module" src="${srriptUriToLoad}"></script>
				<script type="module" src="${scriptUri}"></script>

            </head>
			<body>
				<h1>${i}</h1>
				<litelement-previewer></litelement-previewer>
			</body>
            </html>
	
	`;
}



interface DocEntry {
	name?: string,
	value?: string,
	fileName?: string,
	documentation?: string,
	type?: string,
	constructors?: DocEntry[],
	parameters?: DocEntry[],
	decorators?: DocEntry[],
	returnType?: string;
	returnTypeData?: DocEntry;


};
export interface LitElementProperty {
	fieldName: string;
	type: string | LitElementTypeReflection;
}
export interface LitElementTypeReflection {
	className: string;
	customElementName: string;

	properties: LitElementProperty[];
}

const regexDecoratorData = RegExp(/\(([^)]+)\)/);

function getLitElementInfoFromDocEntry(rootObj: DocEntry): LitElementTypeReflection {
	console.log(rootObj);
	const item = {} as LitElementTypeReflection;
	item.className = rootObj.name ?? '';
	if (rootObj.decorators) {
		const fullText = rootObj.decorators[0].value ?? '';
		console.log(fullText);
		const tags = fullText.match(regexDecoratorData);
		if (tags && tags[1]) {
			item.customElementName = tags[1].replace(/\'/gi, '').replace(/"/gi, '');
			console.log('TAG', item.customElementName);
		}
	} else {
		console.log('could not get customElement decorator for ', rootObj.name);
	}

	item.properties = (rootObj.parameters ?? []).map((propertyEntry) => {

		const prop = {
			fieldName: propertyEntry.name ?? '',
			type: ''
		} as LitElementProperty;

		const decoratorWanted = propertyEntry.decorators?.find(x => x.name === 'property');

		const tags = decoratorWanted?.value?.match(regexDecoratorData);
		if (tags && tags[1]) {
			const jsonStr = normalizeJson(tags[1]);
			const obj = JSON.parse(jsonStr);
			prop.type = obj.type;
			if (prop.type === 'Object') {
				// check for the additional data type info for object
				if (propertyEntry.returnTypeData) {

					prop.type = {
						className: propertyEntry.returnTypeData.name,
						customElementName: 'property',
						properties: propertyEntry.returnTypeData.parameters?.map(param => {
							return {
								fieldName: param.name,
								type: param.returnType
							} as LitElementProperty;
						})
					} as LitElementTypeReflection;

				} else {
					console.log('GOT NO DETAIL FOR THE OBJET');
				}
			}
		}
		return prop;
	});

	return item;
}


/** Generate documention for all classes in a set of .ts files */
function generateDocumentation(fileNames: string[], options: ts.CompilerOptions,
	classDecorator: string, propertyDecorator: string): DocEntry[] {
	// Build a program using the set of root file names in fileNames
	let program = ts.createProgram(fileNames, options);

	// Get the checker, we will use it to find more about classes
	let checker = program.getTypeChecker();

	let output: DocEntry[] = [];

	// Visit every sourceFile in the program
	for (const sourceFile of program.getSourceFiles()) {
		// Walk the tree to search for classes
		ts.forEachChild(sourceFile, visit);
	}

	return output;

	/** visit nodes finding exported classes */
	function visit(node: ts.Node, ) {
		// Only consider exported nodes
		if (!isNodeExported(node)) {
			return;
		}

		if (node.kind === ts.SyntaxKind.ClassDeclaration) {
			// This is a top level class, get its symbol
			const ser = serializeClass((<ts.ClassDeclaration>node));
			if (ser.decorators && ser.decorators.length > 0) {
				const index = ser.decorators.findIndex(d => d.name === classDecorator);
				if (index > -1) {
					output.push(ser);
				}
			}
			// No need to walk any further, class expressions/inner declarations
			// cannot be exported
		}
		else if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
			// This is a namespace, visit its children
			ts.forEachChild(node, visit);
		}
	}

	/** Serialize a symbol into a json object */
	function serializeSymbol(symbol: ts.Symbol): DocEntry {
		return {
			name: symbol.getName(),
			// documentation: ts.displayPartsToString((symbol as any).getDocumentationComment()),
			type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
		};
	}

	/** Serialize a class symbol infomration */
	function serializeClass(node: ts.ClassDeclaration) {
		let symbol = checker.getSymbolAtLocation((node as any).name);

		let details = serializeSymbol(symbol as any);
		details.decorators = node?.decorators?.map(serializeDecorator);
		details.parameters = [];
		node.members.map((member) => {
			if (member.decorators && member.decorators.length > 0) {
				const d = checker.getSymbolAtLocation((member as any).name);
				const docEntry = serializeSymbol(d as any);
				const returnType = checker.getTypeOfSymbolAtLocation(d as ts.Symbol, (d as any).valueDeclaration);
				if (returnType.symbol) {
					const symbol = returnType.symbol;
					let detail = serializeSymbol(symbol);
					detail.parameters = [];
					if (symbol.members) {
						symbol.members.forEach((s, k) => {
							const entry = serializeSymbol(s as any);
							const returnT = checker.getTypeOfSymbolAtLocation(s as ts.Symbol, (d as any).valueDeclaration);
							entry.returnType = checker.typeToString(returnT);
							detail.parameters?.push(entry);
						});
					}
					docEntry.returnTypeData = detail;
				}
				docEntry.decorators = member.decorators.map(serializeDecorator);
				details.parameters?.push(docEntry);
			}
		});
		return details;
	}

	function serializeDecorator(decorator: ts.Decorator) {
		console.log(decorator.getText());
		let symbol = checker.getSymbolAtLocation((decorator as any).expression.getFirstToken());
		//let decoratorType = checker.getTypeOfSymbolAtLocation(symbol as any, (symbol as any).valueDeclaration);
		let details = serializeSymbol(symbol as any);
		details.value = decorator.getText();
		//details.constructors = decoratorType.getCallSignatures().map(serializeSignature);
		return details;
	}

	/** Serialize a signature (call or construct) */
	function serializeSignature(signature: ts.Signature) {
		return {
			parameters: signature.parameters.map(serializeSymbol),
			returnType: checker.typeToString(signature.getReturnType()),
			documentation: ts.displayPartsToString((signature as any).getDocumentationComment())
		};
	}

	/** True if this is visible outside this file, false otherwise */
	function isNodeExported(node: ts.Node): boolean {
		return (node.flags & (ts.NodeFlags as any).Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
	}
}
function normalizeJson(str: string) { return str.replace(/"?([\w_\- ]+)"?\s*?:\s*?"?(.*?)"?\s*?([,}\]])/gsi, (str, index, item, end) => '"' + index.replace(/"/gsi, '').trim() + '":"' + item.replace(/"/gsi, '').trim() + '"' + end).replace(/,\s*?([}\]])/gsi, '$1'); }


function getElementTypeInfo(files: string[]): LitElementTypeReflection[] {
	return generateDocumentation(files, {
		target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS
	}, 'customElement', 'property').map(getLitElementInfoFromDocEntry);
}
