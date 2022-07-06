<?php

namespace Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Models\User;

class UserController extends Controller
{	
	public function list(Request $request)
    {  
        try{
            return view('view.list');
        }catch(\Exception $e){
            return redirect()->back()->with('error','An error');
        }  
    }
}